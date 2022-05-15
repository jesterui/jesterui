import React, { useEffect, useState, useCallback, useRef, useMemo, useLayoutEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useOutgoingNostrEvents } from '../context/NostrEventsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'
import { CopyButtonWithConfirmation } from '../components/CopyButton'
import { GameStartOrNewIdentityButton, LoginOrNewIdentityButton } from '../components/GameStartOrNewIdentityButton'
import { ChessInstance } from '../components/ChessJsTypes'
import { RoboHashImg, UnknownImg } from '../components/RoboHashImg'

import { useResize } from '../hooks/ElementDimensions'

import * as NIP01 from '../util/nostr/nip01'
import { GameMoveEvent } from '../util/app_db'
import * as NostrEvents from '../util/nostr/events'
import * as JesterUtils from '../util/jester'
import { JesterMove, GameStart, GameMove } from '../util/jester'
import * as AppUtils from '../util/app'
import { getSession } from '../util/session'
// @ts-ignore
import * as Chess from 'chess.js'
import * as cg from 'chessground/types'

// @ts-ignore
import Icon from '@material-tailwind/react/Icon'
// @ts-ignore
import Input from '@material-tailwind/react/Input'
// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import Popover from '@material-tailwind/react/Popover'
// @ts-ignore
import PopoverContainer from '@material-tailwind/react/PopoverContainer'
// @ts-ignore
import PopoverHeader from '@material-tailwind/react/PopoverHeader'
// @ts-ignore
import PopoverBody from '@material-tailwind/react/PopoverBody'
// @ts-ignore
import Tooltips from '@material-tailwind/react/Tooltips'
// @ts-ignore
import TooltipsContent from '@material-tailwind/react/TooltipsContent'
// @ts-ignore
import Small from '@material-tailwind/react/Small'

type MovableColor = [] | [cg.Color] | ['white', 'black']
const MOVE_COLOR_NONE: MovableColor = []
const MOVE_COLOR_WHITE: MovableColor = ['white']
const MOVE_COLOR_BLACK: MovableColor = ['black']
// const MOVE_COLOR_BOTH: MovableColor = ['white', 'black']

const MIN_LOADING_INDICATOR_DURATION_IN_MS = 750
const MAX_LOADING_INDICATOR_DURATION_IN_MS = process.env.NODE_ENV === 'development' ? 3_000 : 5_000

const titleMessage = (game: ChessInstance, color: MovableColor) => {
  if (game.game_over()) {
    if (game.in_draw()) {
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
  onGameChanged: (game: ChessInstance) => void
}

function BoardContainer({ size, game, color, onGameChanged }: BoardContainerProps) {
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
      <div className="flex items-center">
        <Input
          type="text"
          color="lightBlue"
          size="md"
          outline={true}
          value={value}
          placeholder="Link to Game"
          readOnly={true}
          style={{ color: 'currentColor' }}
        />
        <CopyButtonWithConfirmation
          className="h-11 ml-1 px-4 flex items-center justify-center font-bold outline-none uppercase tracking-wider focus:outline-none focus:shadow-none transition-all duration-300 rounded-lg text-xs leading-normal text-white bg-blue-gray-500 hover:bg-blue-gray-700 focus:bg-blue-gray-400 active:bg-blue-gray-800 shadow-md-blue-gray hover:shadow-lg-blue-gray"
          value={value}
          text="Copy"
          successText="Copied"
          disabled={!value}
        />
      </div>
      <div className="flex justify-center my-1">
        <Small color="amber">Share this link with anyone to join in!</Small>
      </div>
    </div>
  )
}

const GameOverMessage = ({ game }: { game: ChessInstance }) => {
  if (!game.game_over()) {
    return <></>
  }

  if (game.in_stalemate()) {
    return <>Stalemate</>
  }
  if (game.in_threefold_repetition()) {
    return <>Threefold repetition</>
  }
  if (game.insufficient_material()) {
    return <>Insufficient material</>
  }

  if (game.in_draw()) {
    return <>Draw</>
  }

  return <>{`${game.turn() === 'b' ? 'White' : 'Black'} won`}</>
}

const ColorMessage = ({ color }: { color: MovableColor }) => {
  return (
    <div>
      <h6 className="text-blue-gray-500 text-sm font-serif font-bold mt-0 mb-0">
        {`You are ${color.length === 0 ? 'in watch-only mode' : color}`}
      </h6>
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
      <h6 className="text-blue-gray-500 text-sm lg:text-2xl font-serif font-bold mt-0 mb-0">
        {isLoading && game === null && 'Loading...'}
        {isLoading && game !== null && 'Loading...'}
        {!isLoading && game !== null && titleMessage(game, color)}
        {!isLoading && game === null && '...'}
      </h6>
    </div>
  )
}

function ProposeTakebackButton({ disabled, vertical = false }: { disabled: boolean; vertical?: boolean }) {
  const buttonRef = useRef()

  const tooltipPlacement = useMemo(() => (vertical ? 'right' : 'top'), [vertical])
  const popoverPlacement = useMemo(() => (vertical ? 'right' : 'bottom'), [vertical])

  return (
    <>
      <Button className="w-8 mx-2 md:mx-4" color="" ref={buttonRef} ripple="light" disabled={disabled}>
        <Icon name="undo" size="xl" />
      </Button>
      <Tooltips placement={tooltipPlacement} ref={buttonRef}>
        <TooltipsContent>Propose a takeback</TooltipsContent>
      </Tooltips>

      <Popover placement={popoverPlacement} ref={buttonRef}>
        <PopoverContainer>
          <PopoverHeader>Propose a takeback</PopoverHeader>
          <PopoverBody>Proposing to take back your move is not yet implemented.</PopoverBody>
        </PopoverContainer>
      </Popover>
    </>
  )
}
function ResignButton({ disabled, vertical = false }: { disabled: boolean; vertical?: boolean }) {
  const buttonRef = useRef()

  const tooltipPlacement = useMemo(() => (vertical ? 'right' : 'top'), [vertical])
  const popoverPlacement = useMemo(() => (vertical ? 'right' : 'bottom'), [vertical])

  return (
    <>
      <Button className="w-8 mx-2 md:mx-4" color="" ref={buttonRef} ripple="light" disabled={disabled}>
        <Icon name="cancel" size="xl" />
      </Button>
      <Tooltips placement={tooltipPlacement} ref={buttonRef}>
        <TooltipsContent>Resign</TooltipsContent>
      </Tooltips>

      <Popover placement={popoverPlacement} ref={buttonRef}>
        <PopoverContainer>
          <PopoverHeader>Resign</PopoverHeader>
          <PopoverBody>Don't resign! It is not yet implemented, keep playing!</PopoverBody>
        </PopoverContainer>
      </Popover>
    </>
  )
}

function OfferDrawButton({ disabled, vertical = false }: { disabled: boolean; vertical?: boolean }) {
  const buttonRef = useRef()

  const tooltipPlacement = useMemo(() => (vertical ? 'right' : 'top'), [vertical])
  const popoverPlacement = useMemo(() => (vertical ? 'right' : 'bottom'), [vertical])

  return (
    <>
      <Button className="w-8 mx-2 md:mx-4" color="" ref={buttonRef} ripple="light" disabled={disabled}>
        <Icon name="handshake" size="xl" />
      </Button>
      <Tooltips placement={tooltipPlacement} ref={buttonRef}>
        <TooltipsContent>Offer Draw</TooltipsContent>
      </Tooltips>

      <Popover placement={popoverPlacement} ref={buttonRef}>
        <PopoverContainer>
          <PopoverHeader>Offer Draw</PopoverHeader>
          <PopoverBody>Offering a draw is not yet impelemented.</PopoverBody>
        </PopoverContainer>
      </Popover>
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
  onChessboardChanged: (chessboard: ChessInstance) => Promise<void>
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

interface ActionButtonsProps {
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

export default function GameByIdPage({ jesterId: argJesterId }: { jesterId?: JesterUtils.JesterId }) {
  const { jesterId: paramsJesterId } = useParams<{ jesterId?: JesterUtils.JesterId }>()

  const [jesterId] = useState<JesterUtils.JesterId | undefined>(
    JesterUtils.tryParseJesterId(argJesterId) || JesterUtils.tryParseJesterId(paramsJesterId) || undefined
  )

  const [gameId] = useState<NIP01.EventId | undefined>(
    (jesterId && JesterUtils.jesterIdToGameId(jesterId)) || undefined
  )

  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const gameStore = useGameStore()

  const [currentChessInstance, setCurrentChessInstance] = useState<ChessInstance | null>(null)
  const [currentGameHead, setCurrentGameHead] = useState<JesterMove | null>(null)
  const [color, setColor] = useState<MovableColor>(MOVE_COLOR_NONE)
  const [isSearchingHead, setIsSearchingHead] = useState(true)

  // TODO: "isLoading" is more like "isWaiting",.. e.g. no game is found.. can be in incoming events the next second,
  // in 10 seconds, or never..
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  useEffect(() => {
    if (!gameId) return

    const previousTitle = document.title
    let titlePrefix = currentChessInstance && !isSearchingHead ? `${titleMessage(currentChessInstance, color)} – ` : ''
    document.title = `${titlePrefix}Game ${AppUtils.displayGameNameShort(gameId)}`

    return () => {
      document.title = previousTitle
    }
  }, [isSearchingHead, gameId, color, currentChessInstance])

  /********************** SUBSCRIBE TO GAME */
  const unsubscribeFromCurrentGame = useCallback(() => {
    settingsDispatch({ currentGameJesterId: undefined } as AppSettings)
  }, [settingsDispatch])

  const subscribeToGame = useCallback(() => {
    if (!jesterId) return
    settingsDispatch({ currentGameJesterId: jesterId } as AppSettings)
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

  const currentGameStartEvent = useLiveQuery(async () => {
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
          const event = JesterUtils.constructGameMoveEvent(publicKey, startId, headId, chessboard)
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

  const findChildren = useCallback((move: JesterUtils.JesterMove, moves: GameMoveEvent[]) => {
    const searchParentMoveId = move.isStart() ? null : move.event().id
    return moves.filter((move) => move.parentMoveId === searchParentMoveId)
  }, [])

  const findNextHead = useCallback(
    (currentHead: JesterUtils.JesterMove, moves: GameMoveEvent[]): JesterUtils.JesterMove => {
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
          <div className="text-blue-gray-500 text-2xl font-serif font-bold mt-0 mb-0">Game not found...</div>
          <div className="mx-4">
            <GameStartOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} hasPublicKey={!!publicKeyOrNull} />
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
                {!isSearchingHead && currentChessInstance.game_over() ? (
                  <>
                    <div className="mb-2 flex justify-between items-center">
                      <div className="text-blue-gray-500 text-2xl font-serif font-bold mt-0 mb-0">
                        <GameOverMessage game={currentChessInstance} />
                      </div>
                      <div className="ml-4">
                        <GameStartOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} />
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
                    className="w-8 h-8 rounded-full shadow-lg-gray bg-blue-gray-500"
                    value={player1PubKey}
                    alt={displayPlayer1PubKey}
                  />
                ) : (
                  <UnknownImg size={8} />
                )}
                <h6 className="mt-0 ml-2 text-blue-gray-500 text-xl font-serif font-bold leading-normal">
                  White {player1PubKey && player1PubKey === publicKeyOrNull && <span className="text-sm">(you)</span>}
                </h6>
                <div className="flex-1"></div>
                <div className="flex justify-center items-center">
                  {privateKeyOrNull &&
                    publicKeyOrNull &&
                    publicKeyOrNull === player1PubKey &&
                    currentChessInstance !== null &&
                    !currentChessInstance.game_over() && (
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
                filter: settings.currentGameJesterId !== jesterId ? 'brightness(0.5)' : undefined,
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
                    className="w-8 h-8 rounded-full shadow-lg-gray bg-blue-gray-500"
                    value={player2PubKey}
                    alt={displayPlayer2PubKey}
                  />
                ) : (
                  <UnknownImg size={8} />
                )}
                <h6 className="mt-0 ml-2 text-blue-gray-500 text-xl font-serif font-bold leading-normal">
                  Black {player2PubKey && player2PubKey === publicKeyOrNull && <span className="text-sm">(you)</span>}
                </h6>

                <div className="flex-1"></div>
                <div className="flex justify-center items-center">
                  {privateKeyOrNull &&
                    publicKeyOrNull &&
                    publicKeyOrNull === player2PubKey &&
                    currentChessInstance !== null &&
                    !currentChessInstance.game_over() && (
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
                <h6 className="text-blue-gray-500 text-xl font-serif font-bold leading-normal mt-0">White</h6>
              </div>
              <div className="flex justify-center">
                {player1PubKey ? (
                  <RoboHashImg
                    className="w-24 h-24 rounded-full shadow-lg-gray bg-blue-gray-500"
                    value={player1PubKey}
                    alt={displayPlayer1PubKey}
                  />
                ) : (
                  <UnknownImg size={24} />
                )}
              </div>
              {player1PubKey && player1PubKey === publicKeyOrNull && (
                <div className="flex justify-center">
                  <span className="text-sm font-bold font-serif text-blue-gray-500">(you)</span>
                </div>
              )}
            </div>
          </div>
          <div className="order-2 ml-2">
            <div className="flex justify-start items-center">
              {privateKeyOrNull &&
                publicKeyOrNull &&
                (publicKeyOrNull === player1PubKey || publicKeyOrNull === player2PubKey) &&
                currentChessInstance !== null &&
                !currentChessInstance.game_over() && (
                  <ActionButtons isLoading={isLoading} isSearchingHead={isSearchingHead} vertical={true} />
                )}
              <div>
                <GameStateMessage isLoading={isLoading || isSearchingHead} game={currentChessInstance} color={color} />
                {!isLoading && currentChessInstance !== null && <ColorMessage color={color} />}

                {(privateKeyOrNull === null || publicKeyOrNull === null) && (
                  <>
                    <LoginOrNewIdentityButton hasPublicKey={!!publicKeyOrNull} />
                  </>
                )}
              </div>
            </div>
            <div>
              {!isLoading && currentChessInstance !== null && (
                <>
                  {!isSearchingHead && currentChessInstance.game_over() ? (
                    <>
                      <div className="text-blue-gray-500 text-2xl font-serif font-bold mt-0 mb-0">
                        <GameOverMessage game={currentChessInstance} />
                      </div>
                      <div className="my-2">
                        {privateKeyOrNull !== null && publicKeyOrNull !== null && (
                          /* This should be a "Start new game" button only.. */
                          <GameStartOrNewIdentityButton hasPrivateKey={true} />
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
                    className="w-24 h-24 rounded-full shadow-lg-gray bg-blue-gray-500"
                    value={player2PubKey}
                    alt={displayPlayer2PubKey}
                  />
                ) : (
                  <UnknownImg size={24} />
                )}
              </div>
              <div className="flex justify-center">
                <h6 className="text-blue-gray-500 text-xl font-serif font-bold leading-normal mt-0">Black</h6>
              </div>
              {player2PubKey && player2PubKey === publicKeyOrNull && (
                <div className="flex justify-center">
                  <span className="text-sm font-bold font-serif text-blue-gray-500">(you)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {settings.dev && (
        <>
          <div style={{ margin: '2.5rem 0' }}></div>
          <div className="my-4">
            <div className="mb-4">
              {settings.currentGameJesterId === jesterId ? (
                <button
                  type="button"
                  className="bg-white bg-opacity-20 rounded px-2 py-1"
                  onClick={() => unsubscribeFromCurrentGame()}
                >
                  Unsubscribe
                </button>
              ) : (
                <button
                  type="button"
                  className="bg-white bg-opacity-20 rounded px-2 py-1"
                  onClick={() => subscribeToGame()}
                >
                  Subscribe
                </button>
              )}
            </div>

            <div>
              <pre className="py-4" style={{ overflowX: 'scroll' }}>
                <div>{`jesterId: ${jesterId}`}</div>
                <div>{`gameId: ${gameId}`}</div>
                <div>{`currentHeadId: ${currentGameHead?.event().id}`}</div>
                <div>{`Moves: ${currentGameMoves.length}`}</div>
                <div>{`isLoading: ${isLoading}`}</div>
                <div>{`isSearchingHead: ${isSearchingHead}`}</div>
                <div>{`currentGameStart: ${currentGameStart?.isStart()}`}</div>
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
