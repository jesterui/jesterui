import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'

import { Game } from '../context/GamesContext'
import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'
import { SelectedBot } from '../components/BotSelector'
import * as Bot from '../util/bot'
import { useNostrStore } from '../context/NostrStoreContext'
import { useGameStore } from '../context/GameEventStoreContext'
import { useLiveQuery } from 'dexie-react-hooks'

import { AppSettings, Subscription, useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useIncomingNostrEventsBuffer, useOutgoingNostrEvents } from '../context/NostrEventsContext'
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
import { ChessInstance } from '../components/ChessJsTypes'
import * as cg from 'chessground/types'
import { GameMoveEvent } from '../util/app_db'

type MovebleColor = [] | [cg.Color] | ['white', 'black']

const MIN_LOADING_INDICATOR_DURATION_IN_MS = 750
const MAX_LOADING_INDICATOR_DURATION_IN_MS = process.env.NODE_ENV === 'development' ? 3_000 : 5_000

function BoardContainer({ game, onGameChanged }: { game: Game; onGameChanged: (game: ChessInstance) => void }) {
  const updateGameCallback = useCallback((modify: (g: ChessInstance) => void) => {
    console.debug('[Chess] updateGameCallback invoked')
    const copyOfGame = { ...game.game }
    modify(copyOfGame)
    onGameChanged(copyOfGame)
  }, [game, onGameChanged])

  return (
    <>
      <div>
        <div style={{ width: 400, height: 400 }}>
          {<Chessboard game={game.game} userColor={game.color} onAfterMoveFinished={updateGameCallback} />}
        </div>
        {false && game && (
          <div className="pl-2 overflow-y-scroll">
            <PgnTable game={game.game} />
          </div>
        )}
      </div>
    </>
  )
}

const BotMoveSuggestions = ({ game }: { game: Game | null }) => {
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
  const [gameOver, setGameOver] = useState<boolean>(game?.game.game_over() || false)

  useEffect(() => {
    if (game === null) return

    if (game.game.game_over()) {
      setGameOver(true)
      return
    }

    const currentFen = game.game.fen()
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

const GameOverMessage = ({ game }: { game: Game }) => {
  if (!game.game.game_over()) {
    return <></>
  }

  if (game.game.in_stalemate()) {
    return <>Game over: Draw by stalemate!</>
  }
  if (game.game.in_threefold_repetition()) {
    return <>Game over: Draw by threefold repetition!</>
  }
  if (game.game.insufficient_material()) {
    return <>Game over: Draw by insufficient material!</>
  }

  if (game.game.in_draw()) {
    return <>Game over: Draw!</>
  }

  return <>Game over: {`${game.game.turn() === 'b' ? 'White' : 'Black'} won`}</>
}

const GameStateMessage = ({ game }: { game: Game }) => {
  if (game.game.game_over()) {
    return (
      <>
        <GameOverMessage game={game} />
      </>
    )
  }

  return <>{`${game.game.turn() === 'b' ? 'black' : 'white'}`} to move</>
}

const LoadingBoard = ({ color }: { color: cg.Color }) => {
  const onGameChanged = useCallback(() => {}, [])
  const loadingGame = useCallback(() => ({
    id: 'loading_game',
    game: new Chess.Chess(),
    color: [color],
  } as Game), [color])

  return <div style={{ filter: 'grayscale()' }}>{<BoardContainer game={loadingGame()} onGameChanged={onGameChanged} />}</div>
}

export default function GameById({ gameId: argGameId }: { gameId?: NIP01.Sha256 | undefined }) {
  const { gameId: paramsGameId } = useParams<{ gameId: NIP01.Sha256 | undefined }>()
  const [gameId] = useState<NIP01.Sha256 | undefined>(argGameId || paramsGameId)

  const outgoingNostr = useOutgoingNostrEvents()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const gameStore = useGameStore()
  const nostrStore = useNostrStore()

  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [currentGameHead, setCurrentGameHead] = useState<PgnruiMove | null>(null)
  const [isSearchingHead, setIsSearchingHead] = useState(true)

  // TODO: "isLoading" is more like "isWaiting",.. e.g. no game is found.. can be in incoming events the next second,
  // in 10 seconds, or never..
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // -----------------------
  const hasChildMoves = async (gameId: NIP01.EventId, refId: NIP01.EventId) => {
    //return (await gameStore.game_move.where(['gameId', 'parentMoveId']).equals([gameId, refId]).limit(1).count()) > 0
    return (await gameStore.game_move.where('parentMoveId').equals(refId).limit(1).count()) > 0
  }
  /*
  const hasReferencingEvents = async (refId: NIP01.EventId) => {
    return (await nostrStore.nostr_event_refs.where('targetIds').equals(refId).limit(1).count()) > 0
  }
  const findReferencingEvents = async (refId: NIP01.EventId) => {
    const eventsRefs = await nostrStore.nostr_event_refs.where('targetIds').equals(refId).toArray()

    const events = await nostrStore.nostr_events
      .where('id')
      .anyOf(eventsRefs.map((it) => it.sourceId))
      .toArray()

    return events
  }
  const findReferencingMoves = async (refId: NIP01.EventId) => {
    const eventsRefs = await nostrStore.nostr_event_refs.where('targetIds').equals(refId).toArray()

    const events = await nostrStore.nostr_events
      .where('id')
      .anyOf(eventsRefs.map((it) => it.sourceId))
      .toArray()

    return events
  }

  const allGameEvents = useLiveQuery(
    async () => {
      if (!gameId) return []

      const events = await findReferencingEvents(gameId)
      return events
    },
    [gameId, currentGameHead],
    [] as NostrEvent[]
  )*/

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

  const updateSubscription = useCallback((sub: Subscription) => {
    const newSubsFilterJson = sub.filters.map((it) => JSON.stringify(it))

    const currentSubs = settings.subscriptions || []
    const currentSub = currentSubs.filter((it) => it.id === sub.id)
    const currentSubFilters = currentSub.length === 0 ? [] : currentSub[0].filters
    const currentSubFiltersJson = currentSubFilters.map((it) => JSON.stringify(it))

    // this is soo stupid..
    const containsNewsSubFilters =
      newSubsFilterJson.filter((it) => {
        return currentSubFiltersJson.includes(it)
      }).length === currentSubFiltersJson.length

    if (!containsNewsSubFilters) {
      const formerSubsWithoutNewSub = (settings.subscriptions || []).filter((it) => it.id !== sub.id)
      if (sub.filters.length > 0) {
        console.log(`[Nostr/Subscriptions] update ${sub.id} filter`, sub)
        settingsDispatch({ subscriptions: [...formerSubsWithoutNewSub, sub] } as AppSettings)
      } else {
        console.log(`[Nostr/Subscriptions] remove ${sub.id} filter`, sub)
        settingsDispatch({ subscriptions: [...formerSubsWithoutNewSub]} as AppSettings)
      }
    }
  }, [settings, settingsDispatch])

  useEffect(() => {
    if (!gameId) return

    const newCurrentGameFilters = AppUtils.createGameFilterByGameId(gameId)

    updateSubscription({
      id: 'current_game',
      filters: newCurrentGameFilters
    })
  }, [gameId, settings, settingsDispatch])
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
    [gameId, incomingNostrBuffer],
    [] as GameMoveEvent[]
  )

  /*const currentGameStart = useLiveQuery(async () => {
    const events = currentGameMoves.filter((move) => move.moveCounter === 1)
    if (events.length === 0) return
    return new GameStart(events[0])
  }, [currentGameMoves])*/

  const newestHeads = useLiveQuery(
    async () => {
      if (!currentGameHead) return []

      const currentHeadId = currentGameHead.event().id
      const searchParentMoveId = currentGameHead.isStart() ? null : currentHeadId
      const events = currentGameMoves.filter((move) => move.parentMoveId === searchParentMoveId)
      //const events = await findReferencingMoves(currentHeadId)
      console.log(`FOUND HEADS FOR ${currentHeadId} ` + events.length)
      return events
    },
    [currentGameHead, currentGameMoves],
    [] as GameMoveEvent[]
  )

  //------------------------

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
    try {
      const event = await sendGameStateViaNostr(chessboard)
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

  /**  MOVE UPDATES******************************************************************* */
  const color = useCallback(() => {
    let color: MovebleColor = []
    if (!currentGameStart || privateKeyOrNull === null || publicKeyOrNull === null) {
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
    return color
  }, [currentGameStart, privateKeyOrNull, publicKeyOrNull])

  useEffect(() => {
    if (!currentGameStart) {
      setCurrentGame(null)
      return
    }

    setCurrentGame((_) => ({
      id: currentGameStart.event().id, // TODO should the game hold the hole event?
      game: new Chess.Chess(),
      color: color(),
    }))
  }, [currentGameStart, color])

  // TODO: maybe do not start the game at "game start", but initialize with latest event?
  useEffect(() => {
    if (isSearchingHead) return
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
  }, [isSearchingHead, currentGameHead])

  const findNewHead = useCallback(
    (currentGameStart: AppUtils.GameStart, currentHead: AppUtils.PgnruiMove | null): AppUtils.PgnruiMove => {
      if (!currentHead) {
        return currentGameStart
      }

      const currentHeadId = currentHead.event().id

      console.log(`Start gathering events referencing current head event ${currentHeadId}`)
      const successors = newestHeads

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
    [newestHeads]
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
    /*hasChildMoves(currentGameStart.event().id, newHead.event().id)
      .then((newHeadHasChildren) => {
        if (abortCtrl.signal.aborted) return

        setCurrentGameHead(newHead)
        setIsSearchingHead(newHeadHasChildren)
      })
      .catch((e) => console.error(e))*/

    return () => {
      abortCtrl.abort()
    }
  }, [currentGameStart, currentGameHead, findNewHead])

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
          <div>{`isLoading: ${isLoading}`}</div>
          <div>{`isSearchingHead: ${isSearchingHead}`}</div>
          <div>{`currentGameStart: ${currentGameStart?.isStart()}`}</div>
          <div>{`Moves: ${currentGameMoves.length}`}</div>
          <div>{`currentHeadId: ${currentGameHead?.event().id}`}</div>
        </>
      }

      {!isLoading && currentGame === null && (
        <div>
          <div>Game not found...</div>
          <CreateGameAndRedirectButton />
        </div>
      )}
      {isLoading && (<>
        {currentGame === null ? (<>
          <div style={{paddingTop: '1.5rem'}}>Loading... (waiting for game data to arrive)</div>
        </>) : (<>
          <div>{`You are ${currentGame.color.length === 0 ? 'in watch-only mode' : currentGame.color}`}</div>
          <div>{`Loading...`}</div>
        </>)}
          <div>
            <LoadingBoard color={currentGame && currentGame.color.length === 1 ? currentGame.color[0] : 'white'} />
          </div>
      </>)}
      {currentGame !== null && (
        <div style={{display: !isLoading ? 'block' : 'none'}}>
          <div>{`You are ${currentGame.color.length === 0 ? 'in watch-only mode' : currentGame.color}`}</div>
          <div>
              <>
              {isSearchingHead && (
                <>
                  <div>{`Loading...`}</div>
                </>
              )}
              {!isSearchingHead && (
                <>
                  <div>{<GameStateMessage game={currentGame} />}</div>
                  <div>{currentGame.game.game_over() && <CreateGameAndRedirectButton />}</div>
                </>
              )}
              {(<>
                <div style={{ display: isSearchingHead ? 'block' : 'none'}}>
                    <LoadingBoard color={currentGame.color.length === 1 ? currentGame.color[0] : 'white'} />
                </div>
                <div style={{ display: !isSearchingHead ? 'block' : 'none'}}>
                    <BoardContainer game={currentGame} onGameChanged={onChessboardChanged} />
                </div>
              </>)}
            </>
          </div>
          <div>
            <BotMoveSuggestions game={isLoading || isSearchingHead ? null : currentGame} />
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
