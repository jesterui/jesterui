import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'

import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'
import { SelectedBot } from '../components/BotSelector'
import * as Bot from '../util/bot'
import { useGameStore } from '../context/GameEventStoreContext'
import { useLiveQuery } from 'dexie-react-hooks'

import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useOutgoingNostrEvents } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as AppUtils from '../util/pgnrui'
import { getSession } from '../util/session'
import { PgnruiMove, GameStart, GameMove } from '../util/pgnrui'
import { CreateGameAndRedirectButton } from './CreateGameButton'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import * as Chess from 'chess.js'
import * as cg from 'chessground/types'
import { ChessInstance } from '../components/ChessJsTypes'
import { GameMoveEvent } from '../util/app_db'

type MovebleColor = [] | [cg.Color] | ['white', 'black']
const MOVE_COLOR_NONE: MovebleColor = []
const MOVE_COLOR_WHITE: MovebleColor = ['white']
const MOVE_COLOR_BLACK: MovebleColor = ['black']
// const MOVE_COLOR_BOTH: MovebleColor = ['white', 'black']

const MIN_LOADING_INDICATOR_DURATION_IN_MS = 750
const MAX_LOADING_INDICATOR_DURATION_IN_MS = process.env.NODE_ENV === 'development' ? 3_000 : 5_000

interface BoardContainerProps {
  game: ChessInstance
  color: MovebleColor
  onGameChanged: (game: ChessInstance) => void
}

function BoardContainer({ game, color, onGameChanged }: BoardContainerProps) {
  const updateGameCallback = useCallback(
    (modify: (g: ChessInstance) => void) => {
      console.debug('[Chess] updateGameCallback invoked')
      const copyOfGame = { ...game }
      modify(copyOfGame)
      onGameChanged(copyOfGame)
    },
    [game, onGameChanged]
  )

  return (
    <>
      <div>
        <div style={{ width: 400, height: 400 }}>
          {<Chessboard game={game} userColor={color} onAfterMoveFinished={updateGameCallback} />}
        </div>
        {false && game && (
          <div className="pl-2 overflow-y-scroll">
            <PgnTable game={game} />
          </div>
        )}
      </div>
    </>
  )
}

const BotMoveSuggestions = ({ game }: { game: ChessInstance | null }) => {
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
  const [latestThinkingFen, setLatestThinkingFen] = useState<Bot.Fen | null>(null)
  const [move, setMove] = useState<Bot.ShortMove | null>(null)
  const [gameOver, setGameOver] = useState<boolean>(game?.game_over() || false)

  useEffect(() => {
    if (game === null) return

    if (game.game_over()) {
      setGameOver(true)
      return
    }

    const currentFen = game.fen()
    setThinkingFens((currentFens) => {
      if (currentFens[currentFens.length - 1] === currentFen) {
        return currentFens
      }
      return [...currentFens, currentFen]
    })
  }, [game])

  useEffect(() => {
    if (!selectedBot) return
    if (isThinking) return
    if (thinkingFens.length === 0) return

    const thinkingFen = thinkingFens[thinkingFens.length - 1]

    const timer = setTimeout(() => {
      const inBetweenUpdate = thinkingFen !== thinkingFens[thinkingFens.length - 1]
      if (inBetweenUpdate) return

      setIsThinking(true)
      setLatestThinkingFen(thinkingFen)
      console.log(`Asking bot ${selectedBot.name} for move suggestion to ${thinkingFen}...`)

      selectedBot.move(thinkingFen).then(({ from, to }: Bot.ShortMove) => {
        console.log(`Bot ${selectedBot.name} found move from ${from} to ${to}.`)

        setMove({ from, to })

        setIsThinking(false)
        setThinkingFens((currentFens) => {
          const i = currentFens.indexOf(thinkingFen)
          if (i < 0) {
            return currentFens
          }

          const copy = [...currentFens]
          // remove all thinking fens that came before this
          copy.splice(0, i + 1)
          return copy
        })
      })
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [selectedBot, thinkingFens, isThinking])

  if (!selectedBot) {
    return <>No bot selected.</>
  }

  return (
    <>
      {`${selectedBot.name}`}
      {gameOver ? (
        ` is ready for the next game.`
      ) : (
        <>
          {!isThinking && !move && thinkingFens.length === 0 && ` is idle...`}
          {isThinking && thinkingFens.length > 0 && ` is thinking (${thinkingFens.length})...`}
          {!isThinking && move && ` suggests ${JSON.stringify(move)}`}
          {/*Latest Thinking Fen: {latestThinkingFen}*/}
        </>
      )}
    </>
  )
}

const GameOverMessage = ({ game }: { game: ChessInstance }) => {
  if (!game.game_over()) {
    return <></>
  }

  if (game.in_stalemate()) {
    return <>Game over: Draw by stalemate!</>
  }
  if (game.in_threefold_repetition()) {
    return <>Game over: Draw by threefold repetition!</>
  }
  if (game.insufficient_material()) {
    return <>Game over: Draw by insufficient material!</>
  }

  if (game.in_draw()) {
    return <>Game over: Draw!</>
  }

  return <>Game over: {`${game.turn() === 'b' ? 'White' : 'Black'} won`}</>
}

const GameStateMessage = ({ game }: { game: ChessInstance }) => {
  if (game.game_over()) {
    return (
      <>
        <GameOverMessage game={game} />
      </>
    )
  }

  return <>{`${game.turn() === 'b' ? 'black' : 'white'}`} to move</>
}

const LoadingBoard = ({ color }: { color: MovebleColor }) => {
  const [game] = useState<ChessInstance>(new Chess.Chess())
  const onGameChanged = useCallback(() => {}, [])

  return (
    <div style={{ filter: 'grayscale()' }}>
      {<BoardContainer game={game} color={color} onGameChanged={onGameChanged} />}
    </div>
  )
}

export default function GameById({ gameId: argGameId }: { gameId?: NIP01.Sha256 | undefined }) {
  const { gameId: paramsGameId } = useParams<{ gameId: NIP01.Sha256 | undefined }>()
  const [gameId] = useState<NIP01.Sha256 | undefined>(argGameId || paramsGameId)

  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const gameStore = useGameStore()

  //const [currentGame, setCurrentGame] = useState<Game | null>(null)
  //const [currentChessInstance, setCurrentChessInstance] = useState<ChessInstance>(new Chess.Chess())
  const [currentChessInstance, setCurrentChessInstance] = useState<ChessInstance | null>(null)
  const [currentGameHead, setCurrentGameHead] = useState<PgnruiMove | null>(null)
  const [isSearchingHead, setIsSearchingHead] = useState(true)

  // TODO: "isLoading" is more like "isWaiting",.. e.g. no game is found.. can be in incoming events the next second,
  // in 10 seconds, or never..
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const previousTitle = document.title
    if (!gameId) {
      document.title = `Game ...`
    } else {
      document.title = `Game ${AppUtils.gameDisplayName(gameId)}`
    }

    return () => {
      document.title = previousTitle
    }
  }, [gameId])

  /********************** SUBSCRIBE TO GAME */
  useEffect(() => {
    if (!gameId) return

    settingsDispatch({ currentGameId: gameId } as AppSettings)

    return () => {
      // TODO: should the gameId be removed when naviating away?
      // This would also close the subscription!
      // settingsDispatch({ currentGameId: undefined } as AppSettings)
    }
  }, [gameId, settingsDispatch])
  /********************** SUBS CRIBE TO GAME - end */

  const currentGameStart = useLiveQuery(async () => {
    if (!gameId) return

    const event = await gameStore.game_start.get(gameId)
    if (!event) {
      return
    }

    return new GameStart(event)
  }, [gameId])

  const currentGameMoves = useLiveQuery(
    async () => {
      if (!gameId) return []

      const events = await gameStore.game_move.where('gameId').equals(gameId).sortBy('moveCounter')
      return events
    },
    [gameId],
    [] as GameMoveEvent[]
  )

  /*const newestHeads = useLiveQuery(
    async () => {
      if (!currentGameHead) return []

      const currentHeadId = currentGameHead.event().id
      const searchParentMoveId = currentGameHead.isStart() ? null : currentHeadId
      const events = currentGameMoves.filter((move) => move.parentMoveId === searchParentMoveId)
      console.log(`FOUND HEADS FOR ${currentHeadId} ` + events.length)
      return events
    },
    [currentGameHead, currentGameMoves],
    [] as GameMoveEvent[]
  )*/

  //------------------------

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const onChessboardChanged = async (chessboard: ChessInstance) => {
    if (!currentChessInstance) return

    try {
      await sendGameStateViaNostr(chessboard)
    } catch (e) {
      console.error(e)
    }
  }

  const sendGameStateViaNostr = async (chessboard: ChessInstance) => {
    if (!outgoingNostr) {
      throw new Error('Nostr EventBus not ready..')
    }
    if (!publicKeyOrNull) {
      throw new Error('PubKey not available..')
    }
    if (!privateKeyOrNull) {
      throw new Error('PrivKey not available..')
    }
    if (!currentGameHead || !currentGameStart) {
      throw new Error('Game head not available..')
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const history = chessboard.history()
    const latestMove = (history && history[history.length - 1]) || null
    console.log('[]: ', latestMove)

    // TODO: move to AppUtils
    const eventParts = NostrEvents.blankEvent()
    eventParts.kind = NIP01.KindEnum.EventTextNote
    eventParts.pubkey = publicKey
    eventParts.created_at = Math.floor(Date.now() / 1000)
    eventParts.content = JSON.stringify({
      version: '0',
      kind: AppUtils.KindEnum.Move,
      fen: chessboard.fen(),
      move: latestMove,
      history: history,
    })
    eventParts.tags = [
      [NIP01.TagEnum.e, currentGameStart.event().id],
      [NIP01.TagEnum.e, currentGameHead.event().id],
    ]

    return await new Promise<NIP01.Event>(function (resolve, reject) {
      setTimeout(async () => {
        try {
          const event = NostrEvents.constructEvent(eventParts)
          const signedEvent = await NostrEvents.signEvent(event, privateKey)
          outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
          resolve(signedEvent)
        } catch (e) {
          reject(e)
        }
      }, 1)
    })
  }

  const [color, setColor] = useState<MovebleColor>(MOVE_COLOR_NONE)
  useEffect(() => {
    setColor((_) => {
      if (currentGameStart && privateKeyOrNull !== null && publicKeyOrNull !== null) {
        if (publicKeyOrNull === currentGameStart.event().pubkey) {
          //if (process.env.NODE_ENV === 'development') {
          //  return MOVE_COLOR_BOTH
          //}
          return MOVE_COLOR_WHITE
        } else {
          return MOVE_COLOR_BLACK
        }
      }

      return MOVE_COLOR_NONE
    })
  }, [currentGameStart, privateKeyOrNull, publicKeyOrNull])

  /**  MOVE UPDATES******************************************************************* */
  /*const color = useCallback(() => {
    let color: MovebleColor = MOVE_COLOR_NONE
    if (!currentGameStart || privateKeyOrNull === null || publicKeyOrNull === null) {
      color = MOVE_COLOR_NONE
    } else {
      if (publicKeyOrNull === currentGameStart.event().pubkey) {
        color = MOVE_COLOR_WHITE
      } else {
        color = MOVE_COLOR_BLACK
      }
    }
    //*if (process.env.NODE_ENV === 'development') {
    //  color =  ['white', 'black']
    //}
    return color
  }, [currentGameStart, privateKeyOrNull, publicKeyOrNull])*/

  useEffect(() => {
    if (!currentGameStart) {
      setCurrentChessInstance(null)
      return
    }

    console.log('NEW2d')

    setCurrentChessInstance(new Chess.Chess())
    setCurrentGameHead(null)
  }, [currentGameStart])

  // TODO: maybe do not start the game at "game start", but initialize with latest event?
  useEffect(() => {
    if (isSearchingHead) return
    if (!currentGameHead) return

    setCurrentChessInstance((current) => {
      if (!current) return current

      // TODO: does the "game" really need to change, or can you just do:
      // current.game.load_pgn(history.join('\n'))
      // without returning a copy?
      const newGame = new Chess.Chess()
      const loaded = newGame.load_pgn(currentGameHead.pgn())
      console.log('LOADED NEW GAME STATE FROM PGN', loaded, currentGameHead.pgn())

      return newGame
    })
  }, [isSearchingHead, currentGameHead])

  const findNewHead = useCallback(
    (currentGameStart: AppUtils.GameStart, currentHead: AppUtils.PgnruiMove | null): AppUtils.PgnruiMove => {
      if (!currentHead) {
        return currentGameStart
      }

      const currentHeadId = currentHead.event().id

      console.log(`Start gathering events referencing current head event ${currentHeadId}`)
      const searchParentMoveId = currentHead.isStart() ? null : currentHeadId
      const successors = currentGameMoves.filter((move) => move.parentMoveId === searchParentMoveId)

      if (successors.length === 0) {
        console.log('Search for current head is over, a head without children has been found.')
        return currentHead
      }

      successors.sort((a, b) => b.created_at - a.created_at)

      console.log(`Found ${successors.length} events referencing the current event...`)

      const earliestArrivingChild = successors[successors.length - 1]
      if (earliestArrivingChild.id === currentHeadId) {
        return currentHead
      }

      try {
        const newHead = new GameMove(earliestArrivingChild, currentHead)
        return newHead
      } catch (err) {
        // this can happen anytime someone sends an event thats not a valid successor to the current head
        console.error(err, earliestArrivingChild.content, currentHead.content())
        return currentHead
      }
    },
    [currentGameMoves]
  )

  useEffect(() => {
    if (!currentGameStart) {
      return
    }

    const abortCtrl = new AbortController()
    const newHead = findNewHead(currentGameStart, currentGameHead)

    setCurrentGameHead(newHead)

    const searchParentMoveId = newHead.isStart() ? null : newHead.event().id
    const children = currentGameMoves.filter((move) => move.parentMoveId === searchParentMoveId)
    setIsSearchingHead(children.length > 0)

    return () => {
      abortCtrl.abort()
    }
  }, [currentGameStart, currentGameMoves, currentGameHead, findNewHead])

  useEffect(() => {
    const abortCtrl = new AbortController()
    const waitDuration = currentGameStart ? MIN_LOADING_INDICATOR_DURATION_IN_MS : MAX_LOADING_INDICATOR_DURATION_IN_MS

    const timer = setTimeout(() => !abortCtrl.signal.aborted && setIsLoading(false), waitDuration)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [currentGameStart])

  if (!gameId) {
    return <div>Error: GameId not present</div>
  }
  return (
    <div className="screen-game-by-id">
      <Heading1 color="blueGray">
        Game <span className="font-mono">{AppUtils.gameDisplayName(gameId)}</span>
      </Heading1>

      {
        <>
          <div>{`gameId: ${gameId}`}</div>
          <div>{`currentHeadId: ${currentGameHead?.event().id}`}</div>
          <div>{`Moves: ${currentGameMoves.length}`}</div>
          <div>{`isLoading: ${isLoading}`}</div>
          <div>{`isSearchingHead: ${isSearchingHead}`}</div>
          <div>{`currentGameStart: ${currentGameStart?.isStart()}`}</div>
        </>
      }

      {!isLoading && currentChessInstance === null && (
        <div>
          <div>Game not found...</div>
          <CreateGameAndRedirectButton />
        </div>
      )}
      {isLoading && (
        <>
          {currentChessInstance === null ? (
            <>
              <div style={{ paddingTop: '1.5rem' }}>Loading... (waiting for game data to arrive)</div>
            </>
          ) : (
            <>
              <div>{`You are ${color.length === 0 ? 'in watch-only mode' : color}`}</div>
              <div>{`Loading...`}</div>
            </>
          )}
          <div>
            <LoadingBoard color={color.length === 1 ? color : MOVE_COLOR_WHITE} />
          </div>
        </>
      )}
      {currentChessInstance !== null && (
        <div style={{ display: !isLoading ? 'block' : 'none' }}>
          <div>{`You are ${color.length === 0 ? 'in watch-only mode' : color}`}</div>
          <div>
            <>
              {isSearchingHead && (
                <>
                  <div>{`Loading...`}</div>
                </>
              )}
              {!isSearchingHead && (
                <>
                  <div>{<GameStateMessage game={currentChessInstance} />}</div>
                  <div>{currentChessInstance.game_over() && <CreateGameAndRedirectButton />}</div>
                </>
              )}
              {
                <>
                  <div style={{ display: isSearchingHead ? 'block' : 'none' }}>
                    <LoadingBoard color={color.length === 1 ? color : MOVE_COLOR_WHITE} />
                  </div>
                  <div style={{ display: !isSearchingHead ? 'block' : 'none' }}>
                    <BoardContainer game={currentChessInstance} color={color} onGameChanged={onChessboardChanged} />
                  </div>
                </>
              }
            </>
          </div>
          <div>
            <BotMoveSuggestions game={isLoading || isSearchingHead ? null : currentChessInstance} />
          </div>
          {/*currentGameMoves && (
          <div style={{ maxWidth: 600, overflowX: 'scroll' }}>
            <pre>{JSON.stringify(currentGameMoves, null, 2)}</pre>
          </div>
        )*/}
        </div>
      )}
    </div>
  )
}
