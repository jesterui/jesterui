import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useLocation } from 'react-router-dom'

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
import * as AppUtils from '../util/jester'
import { getSession } from '../util/session'
import { JesterMove, GameStart, GameMove } from '../util/jester'
import { CreateGameAndRedirectButton } from './CreateGameButton'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Input from '@material-tailwind/react/Input'

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
        <div style={{ width: 600, height: 600 }}>
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

const CopyGameUrlInput = ({ gameId }: { gameId: NIP01.EventId }) => {
  const val = window.location.href
  const copy = () => {
    console.log(gameId)
  }
  return (
    <div className="flex">
      <Input
        type="text"
        color="lightBlue"
        size="md"
        outline={true}
        value={val}
        placeholder="Link to Game"
        readOnly={true}
        style={{ color: 'white' }}
      />

      <button type="button" className="bg-white bg-opacity-20 rounded px-2 py-1" onClick={() => copy()}>
        Copy
      </button>
    </div>
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

  const [currentChessInstance, setCurrentChessInstance] = useState<ChessInstance | null>(null)
  const [currentGameStart, setCurrentGameStart] = useState<GameStart | null>(null)
  const [currentGameHead, setCurrentGameHead] = useState<JesterMove | null>(null)
  const [color, setColor] = useState<MovebleColor>(MOVE_COLOR_NONE)
  const [isSearchingHead, setIsSearchingHead] = useState(true)

  // TODO: "isLoading" is more like "isWaiting",.. e.g. no game is found.. can be in incoming events the next second,
  // in 10 seconds, or never..
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  useEffect(() => {
    const previousTitle = document.title
    if (!gameId) {
      document.title = `jester - Game ...`
    } else {
      document.title = `jester - Game ${AppUtils.gameDisplayName(gameId)}`
    }

    return () => {
      document.title = previousTitle
    }
  }, [gameId])

  /********************** SUBSCRIBE TO GAME */
  const unsubscribeFromCurrentGame = useCallback(() => {
    settingsDispatch({ currentGameId: undefined } as AppSettings)
  }, [settingsDispatch])

  const subscribeToGameId = useCallback(() => {
    if (!gameId) return
    settingsDispatch({ currentGameId: gameId } as AppSettings)
  }, [gameId, settingsDispatch])

  useEffect(() => {
    subscribeToGameId()

    return () => {
      // TODO: should the gameId be removed when naviating away?
      // This would also close the subscription!
      // unsubscribeFromCurrentGame()
    }
  }, [subscribeToGameId])

  /********************** SUBSCRIBE TO GAME - end */

  const currentGameStartEvent = useLiveQuery(async () => {
    if (!gameId) return

    const event = await gameStore.game_start.get(gameId)
    if (!event) return

    return event
  }, [gameId])

  useEffect(() => {
    setCurrentGameStart((current) => {
      if (!currentGameStartEvent) {
        return null
      }
      if (current && current.event().id === currentGameStartEvent.id) {
        return current
      }
      return new GameStart(currentGameStartEvent)
    })
  }, [currentGameStartEvent])

  const currentGameMoves = useLiveQuery(
    async () => {
      if (!gameId) return []

      const events = await gameStore.game_move.where('gameId').equals(gameId).sortBy('moveCounter')
      return events
    },
    [gameId],
    [] as GameMoveEvent[]
  )

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
    if (!currentGameStart || !currentGameHead) {
      throw new Error('Game head not available..')
    }
    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const startId = currentGameStart.event().id
    const headId = currentGameHead.event().id

    return await new Promise<NIP01.Event>(function (resolve, reject) {
      setTimeout(async () => {
        try {
          const event = AppUtils.constructGameMoveEvent(publicKey, startId, headId, chessboard)
          const signedEvent = await NostrEvents.signEvent(event, privateKey)
          outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
          resolve(signedEvent)
        } catch (e) {
          reject(e)
        }
      }, 1)
    })
  }

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

  useEffect(() => {
    setCurrentGameHead(currentGameStart)
  }, [currentGameStart])

  useEffect(() => {
    setCurrentChessInstance((current) => {
      if (!currentGameHead) {
        return null
      }

      if (isSearchingHead && current !== null) {
        return current
      }
      const newGame = new Chess.Chess()
      if (isSearchingHead) {
        return newGame
      }

      // TODO: does the "game" really need to change, or can you just do:
      // current.game.load_pgn(history.join('\n'))
      // without returning a copy?
      if (currentGameHead.isStart()) {
        return newGame
      } else {
        const pgn = currentGameHead.pgn()
        const loaded = newGame.load_pgn(pgn)
        if (!loaded) {
          // should not happen as currentGameHead contains a valid pgn
          throw new Error(`Cannot load new game state from pgn: ${pgn}`)
        }

        console.info('loaded new game state from pgn', pgn)
        return newGame
      }
    })
  }, [isSearchingHead, currentGameHead])

  const findChildren = useCallback((move: AppUtils.JesterMove, moves: GameMoveEvent[]) => {
    const searchParentMoveId = move.isStart() ? null : move.event().id
    return moves.filter((move) => move.parentMoveId === searchParentMoveId)
  }, [])

  const findNextHead = useCallback(
    (currentHead: AppUtils.JesterMove, moves: GameMoveEvent[]): AppUtils.JesterMove => {
      const children = findChildren(currentHead, moves)

      if (children.length === 0) {
        return currentHead
      } else {
        children.sort((a, b) => b.created_at - a.created_at)
        const earliestArrivingChild = children[children.length - 1]
        try {
          return new GameMove(earliestArrivingChild, currentHead)
        } catch (err) {
          // this can happen anytime someone sends an event thats not a valid successor to the current head
          console.error(err, earliestArrivingChild.content, currentHead.content())
          return currentHead
        }
      }
    },
    [findChildren]
  )

  useEffect(() => {
    if (!currentGameStart) return
    if (!currentGameHead) return

    console.debug(`Start gathering events referencing current head event ${currentGameHead.event().id}`)

    const newHead = findNextHead(currentGameHead, currentGameMoves)
    setCurrentGameHead(newHead)

    const children = findChildren(newHead, currentGameMoves)
    const stillSearching = children.length > 0
    setIsSearchingHead(stillSearching)

    if (!stillSearching) {
      console.debug('Search for head is over, current head is at the top and has no children.')
    } else {
      console.debug(`Search for head continues. Found ${children.length} event(s) referencing the current head...`)
    }
  }, [currentGameStart, currentGameMoves, currentGameHead, findNextHead, findChildren])

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
      <div style={{ marginTop: '2.5rem' }}></div>

      <div className="flex justify-center">
        {!isLoading && currentChessInstance === null && (
          <div>
            <div>Game not found...</div>
            <CreateGameAndRedirectButton className="bg-white bg-opacity-20 rounded px-5 py-5 mx-5 my-4" />
          </div>
        )}
        {isLoading && (
          <div>
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
          </div>
        )}
        {currentChessInstance !== null && (<div>
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
                    <div>
                      {currentChessInstance.game_over() && (
                        <CreateGameAndRedirectButton className="bg-white bg-opacity-20 rounded px-5 py-5 mx-5 my-4" />
                      )}
                    </div>
                  </>
                )}
                {
                  <>
                    <div style={{ display: isSearchingHead ? 'block' : 'none' }}>
                      <LoadingBoard color={color.length === 1 ? color : MOVE_COLOR_WHITE} />
                    </div>
                    <div
                      style={{
                        display: !isSearchingHead ? 'block' : 'none',
                        filter: settings.currentGameId === gameId ? undefined : 'brightness(0.5)',
                      }}
                    >
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
        </div>)}
      </div>

      <div style={{ margin: '2.5rem 0' }}></div>

      <div className="my-4">
        <CopyGameUrlInput gameId={gameId} />
      </div>

      {
        <div className="my-4">
          <Heading1 color="blueGray">
            Game <span className="font-mono">{AppUtils.gameDisplayName(gameId)}</span>
          </Heading1>

        <div className="my-4">
          {settings.currentGameId === gameId ? (
            <>
              <button
                type="button"
                className="bg-white bg-opacity-20 rounded px-2 py-1"
                onClick={() => unsubscribeFromCurrentGame()}
              >
                Unsubscribe
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="bg-white bg-opacity-20 rounded px-2 py-1"
                onClick={() => subscribeToGameId()}
              >
                Subscribe
              </button>
            </>
          )}
        </div>
        
          <div>{`gameId: ${gameId}`}</div>
          <div>{`currentHeadId: ${currentGameHead?.event().id}`}</div>
          <div>{`Moves: ${currentGameMoves.length}`}</div>
          <div>{`isLoading: ${isLoading}`}</div>
          <div>{`isSearchingHead: ${isSearchingHead}`}</div>
          <div>{`currentGameStart: ${currentGameStart?.isStart()}`}</div>
        </div>
      }
    </div>
  )
}
