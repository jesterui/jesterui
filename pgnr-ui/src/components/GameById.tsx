import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Game } from '../context/GamesContext'
import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'
import { SelectedBot } from '../components/BotSelector'
import * as Bot from '../util/bot'

import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import {
  NostrEventBufferState,
  useOutgoingNostrEvents,
  useIncomingNostrEventsBuffer,
} from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as AppUtils from '../util/pgnrui'
import { getSession } from '../util/session'
import { PgnruiMove, GameStart, GameMove } from '../util/pgnrui'
import CreateGameButton from './CreateGameButton'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import * as Chess from 'chess.js'
import { ChessInstance } from '../components/ChessJsTypes'
import * as cg from 'chessground/types'

type MovebleColor = [] | [cg.Color] | ['white', 'black']

const WAITING_DURATION_IN_MS = process.env.NODE_ENV === 'development' ? 3_000 : 10_000

function BoardContainer({ game, onGameChanged }: { game: Game; onGameChanged: (game: ChessInstance) => void }) {
  const updateGameCallback = (modify: (g: ChessInstance) => void) => {
    console.debug('[Chess] updateGameCallback invoked')
    const copyOfGame = { ...game.game }
    modify(copyOfGame)
    onGameChanged(copyOfGame)
  }

  return (
    <>
      <div style={{ display: 'block' }}>
        <div style={{ width: 400, height: 400 }}>
          {game && <Chessboard game={game!.game} userColor={game!.color} onAfterMoveFinished={updateGameCallback} />}
        </div>
        {false && game && (
          <div className="pl-2 overflow-y-scroll">
            <PgnTable game={game!.game} />
          </div>
        )}
      </div>
    </>
  )
}

const findSuccessor = (state: NostrEventBufferState, gameId: string, moveId: string) =>
  (state.refs[moveId] || [])
    .map((eventId) => state.events[eventId])
    .filter((event) => event !== undefined)
    .filter((event) => {
      // verify that there is an 'e' tag referencing the start event
      const gameIdRefs = event.tags.filter((t) => t && t[0] === 'e' && t[1] === gameId).length
      const moveIdRefs = event.tags.filter((t) => t && t[0] === 'e' && t[1] === moveId).length
      return gameId !== moveId ? gameIdRefs === 1 && moveIdRefs === 1 : gameIdRefs === 2 && moveIdRefs === 2
    })

const BotMoveSuggestions = ({ game }: { game: Game }) => {
  const settings = useSettings()

  const [selectedBot] = useState<SelectedBot>(
    (() => {
      if (settings.botName && Bot.Bots[settings.botName]) {
        return {
          name: settings.botName,
          move: Bot.Bots[settings.botName](),
        }
      }
      return null
    })()
  )

  const [isThinking, setIsThinking] = useState(false)
  const [thinkingFens, setThinkingFens] = useState<Bot.Fen[]>([])
  const [move, setMove] = useState<Bot.ShortMove | null>(null)

  useEffect(() => {
    const currentFen = game.game.fen()
    setThinkingFens((currentFens) => {
      const i = currentFens.indexOf(currentFen)
      const copy = i >= 0 ? currentFens.splice(i, 1) : currentFens
      return [...copy, currentFen]
    })
  }, [game])

  useEffect(() => {
    if (!selectedBot) return
    if (isThinking) return
    if (thinkingFens.length === 0) return

    const abortCtrl = new AbortController()

    const thinkingFen = thinkingFens[thinkingFens.length - 1]
    const timer = setTimeout(() => {
      const inBetweenUpdate = thinkingFen !== thinkingFens[thinkingFens.length - 1]
      if (inBetweenUpdate) return

      setIsThinking(true)
      console.log(`Asking bot ${selectedBot.name} for move suggestion to ${thinkingFen}...`)
      selectedBot.move(thinkingFen).then(({ from, to }: Bot.ShortMove) => {
        console.log(`Bot ${selectedBot.name} found move ${{ from, to }}`)
        // if(abortCtrl.signal.aborted) return

        setMove({ from, to })

        let copy = [...thinkingFens]
        const i = copy.indexOf(thinkingFen)
        // remove all thinking fens that came before this
        if (i >= 0) {
          copy.splice(0, i + 1)
        }
        setThinkingFens(copy)
        setIsThinking(false)
      })
    }, 1_000)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [selectedBot, thinkingFens, isThinking])

  return (
    <>
      {selectedBot ? `${selectedBot.name}` : 'No Bot Selected'}
      {isThinking && `Thinking (${thinkingFens.length})...`}
      {move && ` ${JSON.stringify(move)}`}
    </>
  )
}

export default function GameById({ gameId: argGameId }: { gameId?: NIP01.Sha256 | undefined }) {
  const { gameId: paramsGameId } = useParams<{ gameId: NIP01.Sha256 | undefined }>()
  const [gameId] = useState<NIP01.Sha256 | undefined>(argGameId || paramsGameId)

  const navigate = useNavigate()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()

  const [humanReadableError, setHumanReadableError] = useState<string | null>(null)
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [currentGameStart, setCurrentGameStart] = useState<GameStart | null>(null)
  const [currentGameHead, setCurrentGameHead] = useState<PgnruiMove | null>(null)

  // TODO: "isLoading" is more like "isWaiting",.. e.g. no game is found.. can be in incoming events the next second,
  // in 10 seconds, or never..
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const onChessboardChanged = async (chessboard: ChessInstance) => {
    if (!currentGame) return null

    // TODO: Should we additionally set the game here?
    // leaning towards no.. leads to waiting time before
    // the move is made for the event via nostr to return..
    // but better than to be in an inconsitent state...
    /*setCurrentGame((currentGame) => {
      if (!currentGame) return null
      return { ...currentGame, game: chessboard }
    })*/
    console.log('WILL SEND THE EVENT VIA NOSTR...')
    await sendGameStateViaNostr(currentGame, chessboard)
  }

  const sendGameStateViaNostr = async (currentGame: Game, chessboard: ChessInstance) => {
    if (!outgoingNostr) {
      console.info('Nostr EventBus not ready..')
      return
    }
    if (!publicKeyOrNull) {
      console.info('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      console.info('PrivKey not available..')
      return
    }
    if (!currentGameHead || !currentGameStart) {
      console.info('Game head not available..')
      return
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const history = chessboard.history()
    const latestMove = (history && history[history.length - 1]) || null
    console.log('[]: ', latestMove)

    const eventParts = NostrEvents.blankEvent()
    eventParts.kind = 1 // text_note
    eventParts.pubkey = publicKey
    eventParts.created_at = Math.floor(Date.now() / 1000)
    eventParts.content = JSON.stringify({
      version: '0',
      fen: chessboard.fen(),
      move: latestMove,
      history: history,
    })
    eventParts.tags = [
      ['e', currentGameStart.event().id],
      ['e', currentGameHead.event().id],
    ]

    await new Promise<void>(function (resolve) {
      setTimeout(async () => {
        try {
          const event = NostrEvents.constructEvent(eventParts)
          const signedEvent = await NostrEvents.signEvent(event, privateKey)
          outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
        } finally {
          resolve()
        }
      }, 100)
    })
  }

  const onGameCreated = async (gameId: NIP01.Sha256) => {
    // TODO: this is a hack so we do not need to watch for gameId changes..
    // please, please please.. try to remove it and immediately
    // navigate to /game/:gameId
    navigate(`/redirect/game/${gameId}`)
  }

  // when the gamId changes, or new events arrive, set
  useEffect(() => {
    if (!gameId) {
      setCurrentGameStart(null)
    }
  }, [gameId])

  // when the gamId changes, or new events arrive, set
  useEffect(() => {
    if (!gameId) return
    if (currentGameStart) return

    const bufferState = incomingNostrBuffer.state()
    const gameEvent = bufferState.events[gameId]
    if (!gameEvent) {
      setHumanReadableError('Specified gameId does not reference an existing GameStart event')
      return
    }

    if (!AppUtils.isStartGameEvent(gameEvent)) {
      setHumanReadableError('Specified gameId does not reference a valid GameStart event')
      return
    }

    setCurrentGameStart(new GameStart(gameEvent))
  }, [gameId, currentGameStart, incomingNostrBuffer])

  /**  MOVE UPDATES******************************************************************* */
  useEffect(() => {
    if (!currentGameStart) {
      setCurrentGame(null)
      return
    }

    let color: MovebleColor = []
    if (privateKeyOrNull == null || publicKeyOrNull == null) {
      color = []
    } else {
      if (publicKeyOrNull === currentGameStart.event().pubkey) {
        color = ['white']
      } else {
        color = ['black']
      }
    }
    /*if (process.env.NODE_ENV === 'development') {
      color =  ['white', 'black']
    }*/

    setCurrentGame((_) => ({
      id: currentGameStart.event().id, // TODO should the game hold the hole event?
      game: new Chess.Chess(),
      color,
    }))
  }, [currentGameStart, privateKeyOrNull, publicKeyOrNull])

  // TODO: maybe do not start the game at "game start", but initialize with latest event?
  useEffect(() => {
    if (!currentGameHead) return

    setCurrentGame((current) => {
      if (!current) return current

      // TODO: does the "game" really need to change, or can you just do:
      // current.game.load_pgn(history.join('\n'))
      // without returning a copy?
      const newGame = new Chess.Chess()
      const loaded = newGame.load_pgn(currentGameHead.pgn())
      console.log('LOADED NEW GAME STATE FROM PGN', loaded, currentGameHead.pgn())

      return { ...current, game: newGame }
    })
  }, [currentGameHead])
  /********************** */

  useEffect(() => {
    if (!currentGameStart) return

    const currentGameFilter = AppUtils.createGameFilter(currentGameStart)

    const publicKeyOrNull = settings.identity?.pubkey || null
    const filterForOwnEvents: NIP01.Filter[] = !publicKeyOrNull
      ? []
      : [
          {
            authors: [publicKeyOrNull],
          },
        ]

    const gameFilters = [AppUtils.PGNRUI_START_GAME_FILTER, currentGameFilter]

    const newSubFilters = [...gameFilters, ...filterForOwnEvents]

    const currentSubs = settings.subscriptions || []
    const currentSubFilters = currentSubs.filter((it) => it.id === 'my-sub').map((it) => it.filters)

    // this is soo stupid..
    if (JSON.stringify([newSubFilters]) !== JSON.stringify(currentSubFilters)) {
      // TODO: Replace with "updateSubscriptionSettings"
      settingsDispatch({
        ...settings,
        subscriptions: [
          {
            id: 'my-sub',
            filters: newSubFilters,
          },
        ],
      })
    }
  }, [currentGameStart, settings, settingsDispatch])

  useEffect(() => {
    if (!currentGameStart) return
    else {
      setCurrentGameHead((currentHead) => {
        if (!currentHead) {
          return currentGameStart
        }

        const gameStartEventId = currentGameStart.event().id

        const bufferState = incomingNostrBuffer.state()
        const currentHeadId = currentHead.event().id

        console.log(`Start gathering events referencing current head event ${currentHeadId}`)
        console.log(`Analyzing ${bufferState.order.length} events ...`)
        const successors = findSuccessor(bufferState, gameStartEventId, currentHeadId)

        if (successors.length === 0) {
          console.log('Search for current head is over, a head without children has been found.')
          return currentHead
        }

        successors.sort((a, b) => b.created_at - a.created_at)

        console.log(`Found ${successors.length} events referencing the current event...`)

        const earliestArrivingChild = successors[successors.length - 1]
        try {
          return new GameMove(earliestArrivingChild, currentHead)
        } catch (err) {
          // this can happen anytime someone sends an event thats not a valid successor to the current head
          console.error(err, earliestArrivingChild.content, currentHead.content())
          return currentHead
        }
      })
    }
  }, [currentGameStart, currentGameHead, incomingNostrBuffer])

  useEffect(() => {
    const abortCtrl = new AbortController()
    const timer = setTimeout(() => !abortCtrl.signal.aborted && setIsLoading(false), WAITING_DURATION_IN_MS)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [])

  if (!gameId) {
    return <div>Error: GameId not present</div>
  }

  if (isLoading && currentGame === null) {
    return <>Loading... (waiting for game data to arrive)</>
  }

  if (!isLoading && currentGame === null) {
    return (
      <div>
        <div>Game not found...</div>
        <div>{humanReadableError && `${humanReadableError}`}</div>
        <CreateGameButton onGameCreated={onGameCreated} />
      </div>
    )
  }

  // TODO: Show loading indicator when `(isLoading && currentGame !== null)`
  return (
    <div className="screen-game-by-id">
      <Heading1 color="blueGray">Game {AppUtils.gameDisplayName(gameId)}</Heading1>

      <div>{currentGame && `You are ${currentGame.color.length === 0 ? 'in watch-only mode' : currentGame.color}`}</div>
      <div>{currentGame && currentGame.game && `${currentGame.game.turn() === 'b' ? 'black' : 'white'}`} to move</div>
      <div>{currentGame && <BoardContainer game={currentGame} onGameChanged={onChessboardChanged} />}</div>
      <div>{currentGame && <BotMoveSuggestions game={currentGame} />}</div>
      {/*currentGameStart && (
        <div style={{ maxWidth: 600, overflowX: 'scroll' }}>
          <pre>{JSON.stringify(currentGameStart.event(), null, 2)}</pre>
        </div>
      )*/}
      {!currentGameStart && <div>No game?</div>}
    </div>
  )
}
