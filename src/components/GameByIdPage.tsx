import { useEffect, useState, useCallback, useRef, useMemo, useLayoutEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Input, Tooltip, Modal, Divider } from 'react-daisyui'
import { ArrowUturnLeftIcon, ScaleIcon, XCircleIcon } from '@heroicons/react/24/outline'

import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useOutgoingNostrEvents } from '../context/NostrEventsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'
import { CopyButtonWithConfirmation } from '../components/CopyButton'
import { CreateGameOrNewIdentityButton, LoginOrNewIdentityButton } from '../components/CreateGameOrNewIdentityButton'
import { Chess as ChessInstance } from 'chess.js'
import { RoboHashImg, UnknownImg } from '../components/RoboHashImg'
import Chat from '../components/Chat'

import { useSetWindowTitle } from '../hooks/WindowTitle'
import { useResize } from '../hooks/ElementDimensions'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import {
  JesterId,
  JesterMove,
  GameStart,
  GameMove,
  tryParseJesterId,
  jesterIdToGameId,
  constructGameMoveEvent,
} from '../util/jester'
import * as AppUtils from '../util/app'
import * as Utils from '../util/utils'
import { GameMoveEvent, GameStartEvent } from '../util/app_db'
import { getSession } from '../util/session'

import * as Chess from 'chess.js'
import * as cg from 'chessground/types'
import { Pgn } from '../util/chess'

type MovableColor = [] | [cg.Color] | ['white', 'black']
const MOVE_COLOR_NONE: MovableColor = []
const MOVE_COLOR_WHITE: MovableColor = ['white']
const MOVE_COLOR_BLACK: MovableColor = ['black']
// const MOVE_COLOR_BOTH: MovableColor = ['white', 'black']

const MIN_LOADING_INDICATOR_DURATION_IN_MS = 750
const MAX_LOADING_INDICATOR_DURATION_IN_MS = process.env.NODE_ENV === 'development' ? 3_000 : 5_000

const titleMessage = (game: ChessInstance, color: MovableColor) => {
  if (game.isGameOver()) {
    if (color.length !== 1) {
      if (game.isDraw()) {
        return 'Draw'
      }
      return 'Game Over'
    } else {
      if (game.isDraw()) {
        return '💪 Draw'
      }

      if (color[0].charAt(0) === game.turn()) {
        return '💀 Game Over'
      } else {
        return '🏆 Game Over'
      }
    }
  } else {
    if (color.length !== 1) {
      return `${game.turn() === 'w' ? '♘ White' : '♞ Black'} to move`
    }

    if (color[0].charAt(0) === game.turn()) {
      return `👋 Your turn`
    } else {
      return `💤 Waiting for opponent`
    }
  }
}

const gameStateMessage = (game: ChessInstance, color: MovableColor) => {
  if (game.isGameOver()) {
    if (game.isDraw()) {
      return 'Draw'
    }
    return 'Game Over'
  } else {
    if (color.length !== 1) {
      return `${game.turn() === 'w' ? 'White' : 'Black'} to move`
    }
    if (color[0].charAt(0) === game.turn()) {
      return `Your turn`
    } else {
      return `Waiting for opponent`
    }
  }
}

interface BoardContainerProps {
  game: ChessInstance
  color: MovableColor
  size: number
  onGameChanged: (pgn: Pgn) => void
}

function BoardContainer({ size, game, color, onGameChanged }: BoardContainerProps) {
  const copyOfGame = useMemo(() => new ChessInstance(), [])

  const updateGameCallback = useCallback(
    (modify: (g: ChessInstance) => void) => {
      console.debug('[Chess] updateGameCallback invoked')
      copyOfGame.loadPgn(game.pgn())
      modify(copyOfGame)
      onGameChanged(copyOfGame.pgn() as Pgn)
    },
    [game, onGameChanged]
  )

  return (
    <>
      <div
        style={{
          width: size,
          height: size,
        }}
      >
        {<Chessboard game={game} userColor={color} onAfterMoveFinished={updateGameCallback} />}
      </div>
      {false && game && (
        <div className="pl-2 overflow-y-scroll">
          <PgnTable game={game} />
        </div>
      )}
    </>
  )
}

const CopyGameUrlInput = ({ value }: { value: string }) => {
  return (
    <div>
      <div className="flex items-center gap-1">
        <div className="grow form-control">
          <Input type="text" value={value} placeholder="Link to Game" readOnly={true} />
        </div>
        <CopyButtonWithConfirmation value={value} text="Copy" successText="Copied" disabled={!value} />
      </div>
      <div className="flex justify-center my-1">
        <small className="text-secondary">Share this link with anyone to join in!</small>
      </div>
    </div>
  )
}

const GameOverMessage = ({ game }: { game: ChessInstance }) => {
  if (!game.isGameOver()) {
    return <></>
  }

  if (game.isStalemate()) {
    return <>Stalemate</>
  }
  if (game.isThreefoldRepetition()) {
    return <>Threefold repetition</>
  }
  if (game.isInsufficientMaterial()) {
    return <>Insufficient material</>
  }

  if (game.isDraw()) {
    return <>Draw</>
  }

  return <>{`${game.turn() === 'b' ? 'White' : 'Black'} won`}</>
}

const ColorMessage = ({ color }: { color: MovableColor }) => {
  return (
    <div>
      <h6 className="text-sm font-bold mt-0 mb-0">{`You are ${color.length === 0 ? 'in watch-only mode' : color}`}</h6>
    </div>
  )
}

const GameStateMessage = ({
  isLoading,
  game,
  color,
}: {
  isLoading: boolean
  game: ChessInstance | null
  color: MovableColor
}) => {
  return (
    <div>
      <h6 className="lg:text-2xl font-bold mt-0 mb-0">
        {isLoading && game === null && 'Loading...'}
        {isLoading && game !== null && 'Loading...'}
        {!isLoading && game !== null && gameStateMessage(game, color)}
        {!isLoading && game === null && '...'}
      </h6>
    </div>
  )
}

function ProposeTakebackButton({ disabled, vertical = false }: { disabled: boolean; vertical?: boolean }) {
  const tooltipPlacement = useMemo(() => (vertical ? 'right' : 'top'), [vertical])
  const modalRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <Tooltip message="Propose a takeback" position={tooltipPlacement}>
        <Button shape="circle" color="ghost" onClick={() => modalRef.current?.showModal()} disabled={disabled}>
          <ArrowUturnLeftIcon className="w-6 h-6" />
        </Button>
      </Tooltip>

      <Modal ref={modalRef} backdrop={true}>
        <Button size="sm" shape="circle" className="absolute right-2 top-2" onClick={() => modalRef.current?.close()}>
          ✕
        </Button>
        <Modal.Header className="font-bold">Propose a takeback</Modal.Header>

        <Modal.Body>Proposing to take back your move is not yet implemented.</Modal.Body>
      </Modal>
    </>
  )
}

function ResignButton({ disabled, vertical = false }: { disabled: boolean; vertical?: boolean }) {
  const tooltipPlacement = useMemo(() => (vertical ? 'right' : 'top'), [vertical])
  const modalRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <Tooltip message="Resign" position={tooltipPlacement}>
        <Button shape="circle" color="ghost" onClick={() => modalRef.current?.showModal()} disabled={disabled}>
          <XCircleIcon className="w-6 h-6" />
        </Button>
      </Tooltip>

      <Modal ref={modalRef} backdrop={true}>
        <Button size="sm" shape="circle" className="absolute right-2 top-2" onClick={() => modalRef.current?.close()}>
          ✕
        </Button>
        <Modal.Header className="font-bold">Resign</Modal.Header>

        <Modal.Body>Don't resign! It is not yet implemented, keep playing!</Modal.Body>
      </Modal>
    </>
  )
}

function OfferDrawButton({ disabled, vertical = false }: { disabled: boolean; vertical?: boolean }) {
  const tooltipPlacement = useMemo(() => (vertical ? 'right' : 'top'), [vertical])
  const modalRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <Tooltip message="Offer draw" position={tooltipPlacement}>
        <Button shape="circle" color="ghost" onClick={() => modalRef.current?.showModal()} disabled={disabled}>
          <ScaleIcon className="w-6 h-6" />
        </Button>
      </Tooltip>

      <Modal ref={modalRef} backdrop={true}>
        <Button size="sm" shape="circle" className="absolute right-2 top-2" onClick={() => modalRef.current?.close()}>
          ✕
        </Button>
        <Modal.Header className="font-bold">Offer draw</Modal.Header>

        <Modal.Body>Offering a draw is not yet impelemented.</Modal.Body>
      </Modal>
    </>
  )
}

const LoadingBoard = ({ color, size }: { size: number; color: MovableColor }) => {
  const [game] = useState<ChessInstance>(new Chess.Chess())
  const onGameChanged = useCallback(() => {}, [])

  return (
    <div style={{ filter: 'grayscale()' }}>
      {<BoardContainer game={game} color={color} onGameChanged={onGameChanged} size={size} />}
    </div>
  )
}

interface GameboardWithLoaderProps {
  game: ChessInstance | null
  color: MovableColor
  isLoading: boolean
  isSearchingHead: boolean
  onChessboardChanged: (pgn: Pgn) => Promise<void>
}

function GameboardWithLoader({
  game,
  color,
  isLoading,
  isSearchingHead,
  onChessboardChanged,
}: GameboardWithLoaderProps) {
  const divForSizeRef = useRef<HTMLDivElement>(null)
  const { width: elementRefWidth } = useResize(divForSizeRef)
  const [size, setSize] = useState(0)

  useLayoutEffect(() => {
    const minSize = 240 // minimal screen size, e.g. smart watches
    const maxSize = 620
    const size = Math.min(maxSize, Math.max(minSize, elementRefWidth))

    setSize(size)
  }, [elementRefWidth])

  return (
    <>
      <div ref={divForSizeRef} className="board-size-ref" style={{ height: 0, visibility: 'hidden' }}></div>
      <div className="flex justify-center">
        {(isLoading || (!isLoading && game === null)) && (
          <LoadingBoard color={color.length === 1 ? color : MOVE_COLOR_WHITE} size={size} />
        )}
        {game !== null && (
          <>
            {/* it's important that these elements are present in the DOM to avoid flickering */}
            <div style={{ display: isLoading ? 'none' : 'block' }}>
              <div style={{ display: isSearchingHead ? 'block' : 'none' }}>
                <LoadingBoard color={color.length === 1 ? color : MOVE_COLOR_WHITE} size={size} />
              </div>
              <div style={{ display: isSearchingHead ? 'none' : 'block' }}>
                <BoardContainer game={game} color={color} size={size} onGameChanged={onChessboardChanged} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

type ActionButtonsProps = {
  isLoading: boolean
  isSearchingHead: boolean
  vertical?: boolean
}

function ActionButtons({ isLoading, isSearchingHead, vertical = false }: ActionButtonsProps) {
  return (
    <div className={vertical ? 'grid grid-cols-1' : 'flex'}>
      <div>
        <ProposeTakebackButton disabled={isLoading || isSearchingHead} vertical={vertical} />
      </div>
      <div>
        <OfferDrawButton disabled={isLoading || isSearchingHead} vertical={vertical} />
      </div>
      <div>
        <ResignButton disabled={isLoading || isSearchingHead} vertical={vertical} />
      </div>
    </div>
  )
}

type GameByIdProps = {
  jesterId?: JesterId
}

export default function GameByIdPage({ jesterId: argJesterId }: GameByIdProps) {
  const { jesterId: paramsJesterId } = useParams<{ jesterId?: JesterId }>()

  const [jesterId] = useState<JesterId | undefined>(
    tryParseJesterId(argJesterId) || tryParseJesterId(paramsJesterId) || undefined
  )

  const [gameId] = useState<NIP01.EventId | undefined>((jesterId && jesterIdToGameId(jesterId)) || undefined)
  const gameNameShort = useMemo(() => gameId && AppUtils.displayGameNameShort(gameId), [gameId])

  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const gameStore = useGameStore()
  const setWindowTitle = useSetWindowTitle({ transform: Utils.identity })

  const [currentChessInstance, setCurrentChessInstance] = useState<ChessInstance | null>(null)
  const [currentGameHead, setCurrentGameHead] = useState<JesterMove | null>(null)
  const [color, setColor] = useState<MovableColor>(MOVE_COLOR_NONE)
  const [isSearchingHead, setIsSearchingHead] = useState(true)
  const isGameOver = useMemo(() => currentChessInstance && currentChessInstance.isGameOver(), [currentChessInstance])

  // TODO: "isLoading" is more like "isWaiting",.. e.g. no game is found.. can be in incoming events the next second,
  // in 10 seconds, or never..
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  useEffect(() => {
    if (!gameNameShort) return

    let titlePrefix = currentChessInstance && !isSearchingHead ? `${titleMessage(currentChessInstance, color)} – ` : ''
    setWindowTitle(`${titlePrefix}Game ${gameNameShort}`)
  }, [setWindowTitle, isSearchingHead, gameNameShort, color, currentChessInstance])

  /********************** SUBSCRIBE TO GAME */
  const unsubscribeFromCurrentGame = useCallback(() => {
    settingsDispatch({ currentGameJesterId: undefined })
  }, [settingsDispatch])

  const subscribeToGame = useCallback(() => {
    if (!jesterId) return
    settingsDispatch({ currentGameJesterId: jesterId })
  }, [jesterId, settingsDispatch])

  useEffect(() => {
    subscribeToGame()

    return () => {
      // TODO: should the gameId be removed when naviating away?
      // This would also close the subscription!
      // unsubscribeFromCurrentGame()
    }
  }, [subscribeToGame])

  /********************** SUBSCRIBE TO GAME - end */

  const currentGameStartEvent: GameStartEvent | undefined = useLiveQuery(async () => {
    if (!gameId) return
    return await gameStore.game_start.get(gameId)
  }, [gameId])

  const currentGameStart = useMemo(() => {
    if (!currentGameStartEvent) return null
    return new GameStart(currentGameStartEvent)
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

  const player1PubKey = useMemo<NIP01.PubKey | undefined>(() => currentGameStartEvent?.pubkey, [currentGameStartEvent])
  const player2PubKey = useLiveQuery<NIP01.PubKey | undefined>(async () => {
    if (!currentGameStartEvent) return undefined
    const event = await gameStore.game_move.where('[gameId+moveCounter]').equals([currentGameStartEvent.id, 2]).first()

    return (event && event.pubkey) || undefined
  }, [currentGameStartEvent])

  const displayPlayer1PubKey = useMemo(
    () => player1PubKey && AppUtils.pubKeyDisplayName(player1PubKey),
    [player1PubKey]
  )
  const displayPlayer2PubKey = useMemo(
    () => player2PubKey && AppUtils.pubKeyDisplayName(player2PubKey),
    [player2PubKey]
  )

  const onChessboardChanged = async (pgn: Pgn) => {
    if (!currentChessInstance) return

    try {
      currentChessInstance.loadPgn(pgn)
      await sendGameStateViaNostr(currentChessInstance)
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
      setTimeout(() => {
        try {
          const event = constructGameMoveEvent(publicKey, startId, headId, chessboard)
          const signedEvent = NostrEvents.signEvent(event, privateKey)
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
      if (privateKeyOrNull !== null && publicKeyOrNull !== null) {
        if (publicKeyOrNull === player1PubKey) {
          return MOVE_COLOR_WHITE
        } else if (player2PubKey === undefined || publicKeyOrNull === player2PubKey) {
          return MOVE_COLOR_BLACK
        }
      }

      return MOVE_COLOR_NONE
    })
  }, [privateKeyOrNull, publicKeyOrNull, player1PubKey, player2PubKey])

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
      // current.game.loadPgn(history.join('\n'))
      // without returning a copy?
      if (currentGameHead.isStart()) {
        return newGame
      } else {
        const pgn = currentGameHead.content().pgn
        try {
          newGame.loadPgn(pgn)
        } catch (e) {
          // should not happen as currentGameHead contains a valid pgn
          throw new Error(`Cannot load new game state from pgn: ${pgn}`, { cause: e })
        }

        console.info('loaded new game state from pgn', newGame.pgn())
        return newGame
      }
    })
  }, [isSearchingHead, currentGameHead])

  const findChildren = useCallback((move: JesterMove, moves: GameMoveEvent[]) => {
    const searchParentMoveId = move.isStart() ? null : move.event().id
    return moves.filter((move) => move.parentMoveId === searchParentMoveId)
  }, [])

  const findNextHead = useCallback(
    (currentHead: JesterMove, moves: GameMoveEvent[]): JesterMove => {
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

  if (!isLoading && currentChessInstance === null) {
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mx-1">
          <div className="text-2xl font-bold mt-0 mb-0">Game not found...</div>
          <div className="mx-4">
            <CreateGameOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} hasPublicKey={!!publicKeyOrNull} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-game-by-id">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-2 min-w-xs max-w-lg lg:max-w-6xl">
        <div className="order-1">
          <div className="lg:hidden">
            {!isLoading && currentChessInstance !== null && (
              <>
                {!isSearchingHead && isGameOver ? (
                  <>
                    <div className="mb-2 flex justify-between items-center">
                      <div className="text-2xl font-bold mt-0 mb-0">
                        <GameOverMessage game={currentChessInstance} />
                      </div>
                      <div className="ml-4">
                        <CreateGameOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mb-2">
                    <div className="flex justify-center items-center">
                      {!isLoading && currentChessInstance !== null && (
                        <>
                          <ColorMessage color={color} />
                        </>
                      )}
                    </div>

                    {(privateKeyOrNull === null || publicKeyOrNull === null) && (
                      <>
                        <LoginOrNewIdentityButton hasPublicKey={!!publicKeyOrNull} />
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="order-2"></div>
        <div className="order-3">
          <div className="grid grid-cols-1">
            <div className={`lg:hidden ${color === MOVE_COLOR_BLACK ? 'mb-2 order-1' : 'mt-2 order-3'}`}>
              <div className="h-10 flex items-center">
                {player1PubKey ? (
                  <RoboHashImg
                    className="w-8 h-8 rounded-full shadow-lg-gray bg-base-300"
                    value={player1PubKey}
                    alt={displayPlayer1PubKey}
                  />
                ) : (
                  <UnknownImg size={8} />
                )}
                <h6 className="mt-0 ml-2 text-xl font-bold leading-normal">
                  White {player1PubKey && player1PubKey === publicKeyOrNull && <span className="text-sm">(you)</span>}
                </h6>
                <div className="flex-1"></div>
                <div className="flex justify-center items-center">
                  {privateKeyOrNull && publicKeyOrNull && publicKeyOrNull === player1PubKey && isGameOver === false && (
                    <ActionButtons isLoading={isLoading} isSearchingHead={isSearchingHead} />
                  )}
                </div>

                {color === MOVE_COLOR_BLACK && (
                  <div className="flex justify-center items-center">
                    <GameStateMessage
                      isLoading={isLoading || isSearchingHead}
                      game={currentChessInstance}
                      color={color}
                    />
                  </div>
                )}
              </div>
            </div>
            <div
              className="order-2"
              style={{
                filter:
                  settings.currentGameJesterId !== jesterId || isGameOver === true ? 'brightness(0.75)' : undefined,
              }}
            >
              <GameboardWithLoader
                isLoading={isLoading}
                isSearchingHead={isSearchingHead}
                game={currentChessInstance}
                color={color}
                onChessboardChanged={onChessboardChanged}
              />
            </div>
            <div className={`lg:hidden ${color !== MOVE_COLOR_BLACK ? 'mb-2 order-1' : 'mt-2 order-3'}`}>
              <div className="h-10 flex items-center">
                {player2PubKey ? (
                  <RoboHashImg
                    className="w-8 h-8 rounded-full shadow-lg-gray bg-base-300"
                    value={player2PubKey}
                    alt={displayPlayer2PubKey}
                  />
                ) : (
                  <UnknownImg size={8} />
                )}
                <h6 className="mt-0 ml-2 text-xl font-bold leading-normal">
                  Black {player2PubKey && player2PubKey === publicKeyOrNull && <span className="text-sm">(you)</span>}
                </h6>

                <div className="flex-1"></div>
                <div className="flex justify-center items-center">
                  {privateKeyOrNull && publicKeyOrNull && publicKeyOrNull === player2PubKey && isGameOver === false && (
                    <ActionButtons isLoading={isLoading} isSearchingHead={isSearchingHead} />
                  )}
                </div>

                {color !== MOVE_COLOR_BLACK && (
                  <div className="flex justify-center items-center">
                    <GameStateMessage
                      isLoading={isLoading || isSearchingHead}
                      game={currentChessInstance}
                      color={color}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="order-4 lg:order-5">
          {currentChessInstance !== null && (
            <div className="mt-4 my-2">
              <CopyGameUrlInput value={window.location.href} />
            </div>
          )}
        </div>
        <div className="ml-4 hidden order-5 lg:grid lg:order-4 grid-cols-1 h-full content-between">
          <div className={`flex ${color === MOVE_COLOR_BLACK ? 'order-1' : 'order-3'}`}>
            <div className="grid grid-cols-1">
              <div className="flex justify-center">
                <h6 className="text-xl font-bold leading-normal mt-0">White</h6>
              </div>
              <div className="flex justify-center">
                {player1PubKey ? (
                  <RoboHashImg
                    className="w-24 h-24 rounded-full shadow-lg-gray bg-base-300"
                    value={player1PubKey}
                    alt={displayPlayer1PubKey}
                  />
                ) : (
                  <UnknownImg size={24} />
                )}
              </div>
              {player1PubKey && player1PubKey === publicKeyOrNull && (
                <div className="flex justify-center">
                  <span className="text-sm font-bold">(you)</span>
                </div>
              )}
            </div>
          </div>
          <div className="order-2 ml-6">
            <div className="flex justify-start items-center gap-4">
              {privateKeyOrNull &&
                publicKeyOrNull &&
                (publicKeyOrNull === player1PubKey || publicKeyOrNull === player2PubKey) &&
                isGameOver === false && (
                  <ActionButtons isLoading={isLoading} isSearchingHead={isSearchingHead} vertical={true} />
                )}
              <div>
                <GameStateMessage isLoading={isLoading || isSearchingHead} game={currentChessInstance} color={color} />
                {!isLoading && currentChessInstance !== null && <ColorMessage color={color} />}

                {(privateKeyOrNull === null || publicKeyOrNull === null) && (
                  <LoginOrNewIdentityButton hasPublicKey={!!publicKeyOrNull} />
                )}
              </div>
            </div>
            <div>
              {!isLoading && currentChessInstance !== null && (
                <>
                  {!isSearchingHead && isGameOver ? (
                    <>
                      <div className="text-2xl font-bold mt-0 mb-0">
                        <GameOverMessage game={currentChessInstance} />
                      </div>
                      <div className="my-2">
                        {privateKeyOrNull !== null && publicKeyOrNull !== null && (
                          /* This should be a "Start new game" button only.. */
                          <CreateGameOrNewIdentityButton hasPrivateKey={true} />
                        )}
                      </div>
                    </>
                  ) : (
                    <></>
                  )}
                </>
              )}
            </div>
          </div>
          <div className={`flex items-center ${color === MOVE_COLOR_BLACK ? 'order-3' : 'order-1'}`}>
            <div className="grid grid-cols-1">
              <div className="flex justify-center">
                {player2PubKey ? (
                  <RoboHashImg
                    className="w-24 h-24 rounded-full shadow-lg-gray bg-base-300"
                    value={player2PubKey}
                    alt={displayPlayer2PubKey}
                  />
                ) : (
                  <UnknownImg size={24} />
                )}
              </div>
              <div className="flex justify-center">
                <h6 className="text-xl font-bold leading-normal mt-0">Black</h6>
              </div>
              {player2PubKey && player2PubKey === publicKeyOrNull && (
                <div className="flex justify-center">
                  <span className="text-sm font-bold">(you)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {currentGameStart && (
        <div className="bg-base-300 mt-4 my-2 p-2 rounded-box">
          <Chat
            gameId={currentGameStart.event().id}
            player1PubKey={player1PubKey}
            player2PubKey={player2PubKey}
            privKey={privateKeyOrNull || undefined}
            ourPubKey={publicKeyOrNull || undefined}
            avatar={(val) => <RoboHashImg value={val.pubkey} className="bg-base-100 rounded-full shadow-lg-gray" />}
            gameOver={!!isGameOver}
          />
        </div>
      )}
      {settings.dev && (
        <div className="my-4">
          <div className="mb-4">
            {settings.currentGameJesterId === jesterId ? (
              <Button color="warning" variant="outline" onClick={() => unsubscribeFromCurrentGame()}>
                Unsubscribe
              </Button>
            ) : (
              <Button color="warning" variant="outline" onClick={() => subscribeToGame()}>
                Subscribe
              </Button>
            )}
          </div>

          <div>
            <pre className="py-4" style={{ overflowX: 'scroll' }}>
              <div>{`jesterId: ${jesterId}`}</div>
              <div>{`gameId: ${gameId}`}</div>
              <div>{`currentHead.event.id: ${currentGameHead?.event().id}`}</div>
              <div>{`currentGameStart.isStart: ${currentGameStart?.isStart()}`}</div>
              <div>{`isLoading: ${isLoading}`}</div>
              <div>{`isSearchingHead: ${isSearchingHead}`}</div>
              <div>{`Moves: ${currentGameMoves.length}`}</div>
              <Divider />
              <div>{`currentHead.event: ${JSON.stringify(currentGameHead?.event(), null, 2)}`}</div>
              <div>{`PGN: ${currentChessInstance?.pgn()}`}</div>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
