import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Game } from '../context/GamesContext'
import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'

import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useOutgoingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as AppUtils from '../util/pgnrui'
import { getSession } from '../util/session'
import { PgnruiMove, GameStart, GameMove } from '../util/pgnrui'
import CreateGameButton from './CreateGameButton'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance } from '../components/ChessJsTypes'
import * as cg from 'chessground/types'
import { arrayEquals } from '../util/utils'

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
      <div>{game && `You are ${game.color.length === 0 ? 'in watch-only mode' : game.color}`}</div>
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
    const latestMove = history && history[history.length - 1] || null
    console.log("[]: ", latestMove)

    const eventParts = NostrEvents.blankEvent()
    eventParts.kind = 1 // text_note
    eventParts.pubkey = publicKey
    eventParts.created_at = Math.floor(Date.now() / 1000)
    eventParts.content = JSON.stringify({
      version: '0',
      fen: chessboard.fen(),
      move: latestMove,
      history: history
    })
    eventParts.tags = [
      ['e', currentGameStart.event().id],
      // TODO: misusing 'p'-tag is not nice..
      ['p', currentGameHead.event().id],
    ]
    const event = NostrEvents.constructEvent(eventParts)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
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

    /*let color: MovebleColor = []   
    if (privateKeyOrNull == null || publicKeyOrNull == null) {
      color = []
    } else {
      if (publicKeyOrNull === currentGameStart.event().pubkey) {
        color = ['white']
      } else {
        color = ['black'] 
      }
    }
    if (process.env.NODE_ENV === 'development') {
      color =  ['white', 'black']
    }*/

    setCurrentGame((_) => ({
      id: currentGameStart.event().id, // TODO should the game hold the hole event?
      game: new Chess(),
      color: ['white', 'black'], // TODO: currently make it possible to move both colors
    }))
  }, [currentGameStart, privateKeyOrNull, publicKeyOrNull])

  // TODO: maybe do not start the game at "game start", but initialize with latest event?
  useEffect(() => {
    if (!currentGameHead) return

    setCurrentGame((current) => {
      if (!current) return current

      const historyToMinimalPgn = (history: string[]): string[] => {
        const paired = history.reduce<string[]>((result: string[], value: string, currentIndex: number, array: string[]) => {
          if (currentIndex % 2 === 0) {
            return [...result, array.slice(currentIndex, currentIndex + 2)] as string[]
          }
        return result
        }, [])

        return paired.map((val, index) => {
          if(val.length === 1) {
            return `${index + 1}. ${val[0]}`
          }
          return `${index + 1}. ${val[0]} ${val[1]}`
        })
      }

      // turn HISTORY INTO PGN and LOAD PGN
      const history = historyToMinimalPgn(currentGameHead.content().history || [])
      // TODO: does the "game" really need to change, or can you just do:
      // current.game.load_pgn(history.join('\n'))
      // without returning a copy?
      const newGame = new Chess()
      const loaded = newGame.load_pgn(history.join('\n'))
      console.log('LOADED NEW GAME STATE FROM PGN', loaded)

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

  const createMovesArray = (gameStart: GameStart, events: NIP01.Event[]): PgnruiMove[] => {
    const findSuccessors = (gameId: NIP01.Sha256, moveId: NIP01.Sha256): NIP01.Event[] => {
      return events.filter((event) => {
        const eTagMatches = event.tags.filter((t) => arrayEquals(t, ['e', gameId])).length === 1
        const pTagMatches = event.tags.filter((t) => arrayEquals(t, ['p', moveId])).length === 1
        return eTagMatches && pTagMatches
      })
    }

    const gameStartEventId = gameStart.event().id
    let moves: PgnruiMove[] = []

    let search: PgnruiMove[] = [gameStart]
    do {
      const currentElement = search.shift() as PgnruiMove
      const successors = findSuccessors(gameStartEventId, currentElement.event().id)
      const children = successors
        .map((it, i) => {
          try {
            return new GameMove(it, currentElement)
          } catch (err) {
            console.error(i, err, it.content, currentElement.content())
            return null
          }
        })
        .filter((it) => it !== null) as GameMove[]
      children.forEach((it) => currentElement.addChild(it))
      search = [...search, ...children]
      moves = [...moves, currentElement]
    } while (search.length > 0)

    return moves
  }

  // initial state load TODO: Do not recreate the whole state everytime..
  useEffect(() => {
    if (!currentGameStart) return

    const bufferState = incomingNostrBuffer.state()

    const gameStartEventId = currentGameStart.event().id

    console.log(`Start gathering events referencing game start event ${gameStartEventId}`)
    console.log(`Analyzing ${bufferState.order.length} events ...`)

    // TODO: validate all moves here..
    const eventsBelongingToTheGame = bufferState.order
      .map((eventId) => bufferState.events[eventId])
      .filter((event) => {
        // verify that there is an 'e' tag referencing the start event
        const matchingTags = event.tags.filter((t) => t[0] === 'e' && t[1] === gameStartEventId)
        return matchingTags.length === 1
      })

    eventsBelongingToTheGame.sort((a, b) => b.created_at - a.created_at)

    console.log(`Found ${eventsBelongingToTheGame.length} events referencing start event...`)

    let moves = createMovesArray(currentGameStart, eventsBelongingToTheGame)

    const movesWithoutChildren = moves.filter((it) => it.children().length === 0)
    movesWithoutChildren.sort((a, b) => b.event().created_at - a.event().created_at)

    console.log(`[Chess] Number of heads for current game: ${movesWithoutChildren.length}`)

    setCurrentGameHead(movesWithoutChildren[0])
  }, [currentGameStart, incomingNostrBuffer])

  /*
  useEffect(() => {
    if (!currentGameStart) {
      setCurrentGameHead(null)
    } else {
      setCurrentGameHead(current => {
        if(!current) return currentGameStart
        return current
      })
    }
  }, [currentGameStart])*/

  // TODO: when game is loaded.. analyze just latest messages
  useEffect(() => {
    if (!currentGameStart) return

    // TODO... "if(gameInitiallyLoaded)..."
  }, [currentGameStart, incomingNostrBuffer])

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
        <CreateGameButton onGameCreated={onGameCreated} />
      </div>
    )
  }

  // TODO: Show loading indicator when `(isLoading && currentGame !== null)`
  return (
    <div className="screen-game-by-id">
      <Heading1 color="blueGray">Game {AppUtils.gameDisplayName(gameId)}</Heading1>
      <div>{currentGame && <BoardContainer game={currentGame} onGameChanged={onChessboardChanged} />}</div>
      {currentGameStart && (
        <div style={{ maxWidth: 600, overflowX: 'scroll' }}>
          <pre>{JSON.stringify(currentGameStart.event(), null, 2)}</pre>
        </div>
      )}
      {!currentGameStart && <div>No game?</div>}
    </div>
  )
}
