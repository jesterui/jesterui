import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Game } from '../context/GamesContext'
import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'

import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useOutgoingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { getSession } from '../util/session'
import * as AppUtils from '../util/pgnrui'
import { PgnruiMove, GameStart, GameMove } from '../util/pgnrui'
import CreateGameButton from './CreateGameButton'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance } from '../components/ChessJsTypes'
import * as cg from 'chessground/types'
import { arrayEquals } from '../util/utils'

const WAITING_DURATION_IN_MS = process.env.NODE_ENV === 'development' ? 3_000 : 10_000

function BoardContainer({ game, onGameChanged }: { game: Game; onGameChanged: (game: ChessInstance) => void }) {
  const updateGameCallback = (modify: (g: ChessInstance) => void) => {
    console.debug('[Chess] updateGameCallback invoked')
    const copyOfGame = { ...game.game }
    modify(copyOfGame)
    onGameChanged(copyOfGame)
  }

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: 400, height: 400 }}>
        {game && <Chessboard game={game!.game} userColor={game!.color} onAfterMoveFinished={updateGameCallback} />}
      </div>
      {false && game && (
        <div className="pl-2 overflow-y-scroll">
          <PgnTable game={game!.game} />
        </div>
      )}
    </div>
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

  const [myMoveIds, setMyMoveIds] = useState<NIP01.Sha256[]>([])

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const onChessboardChanged = async (chessboard: ChessInstance) => {
    if (!currentGame) return null

    // TODO: DO NOT SET GAME HERE... SET FROM CHESSBOARD...
    setCurrentGame((currentGame) => {
      if (!currentGame) return null
      return { ...currentGame, game: chessboard }
    })
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

    const eventParts = NostrEvents.blankEvent()
    eventParts.kind = 1 // text_note
    eventParts.pubkey = publicKey
    eventParts.created_at = Math.floor(Date.now() / 1000)
    eventParts.content = chessboard.fen()
    eventParts.tags = [
      ['e', currentGameStart.event().id],
      // TODO: misusing 'p'-tag is not nice..
      ['p', currentGameHead.event().id],
    ]
    const event = NostrEvents.constructEvent(eventParts)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))

    setMyMoveIds((current) => [...current, signedEvent.id])
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
    } else {
      const color = ['white', 'black'][Math.floor(Math.random() * 2)] as cg.Color
      setCurrentGame((_) => ({
        id: currentGameStart.event().id, // TODO should the game hold the hole event?
        game: new Chess(),
        color: ['white', 'black'] || [color], // TODO: currently make it possible to move both colors
      }))
    }
  }, [currentGameStart])

  // TODO: maybe do not start the game at "game start", but initialize with latest event?
  useEffect(() => {
    if (!currentGameStart) return
    if (!currentGameHead) return

    setCurrentGame((current) => {
      if (!current) return current

      // TODO: do not just recreate the game.. history is lost.. do "move updates"
      current.game.load(currentGameHead.fen().value())

      return { ...current }
    })
  }, [currentGameHead])
  /********************** */

  useEffect(() => {
    if (!currentGameStart) return
    const currentGameFilter = AppUtils.createGameFilter(currentGameStart)

    const filterForOwnEvents: NIP01.Filter[] =
      (publicKeyOrNull && [
        {
          authors: [publicKeyOrNull],
        },
      ]) ||
      []

    const gameFilters = [AppUtils.PGNRUI_START_GAME_FILTER, currentGameFilter]

    // TODO: Replace with "updateSubscriptionSettings"
    settingsDispatch({
      ...settings,
      subscriptions: [
        {
          id: 'my-sub',
          filters: [...gameFilters, ...filterForOwnEvents],
        },
      ],
    })
  }, [currentGameStart, settingsDispatch])

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

    const findSuccessors = (gameId: NIP01.Sha256, moveId: NIP01.Sha256): NIP01.Event[] => {
      return eventsBelongingToTheGame.filter((event) => {
        const eTagMatches = event.tags.filter((t) => arrayEquals(t, ['e', gameId])).length === 1
        const pTagMatches = event.tags.filter((t) => arrayEquals(t, ['p', moveId])).length === 1
        return eTagMatches && pTagMatches
      })
    }

    let moves: PgnruiMove[] = []
    {
      let search: PgnruiMove[] = [currentGameStart]
      do {
        const currentElement = search.shift() as PgnruiMove
        const successors = findSuccessors(gameStartEventId, currentElement.event().id)
        const children = successors.map((it) => new GameMove(it, currentElement))
        children.forEach((it) => currentElement.addChild(it))
        search = [...search, ...children]
        moves = [...moves, currentElement]
      } while (search.length > 0)
    }

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
      {currentGame && <BoardContainer game={currentGame} onGameChanged={onChessboardChanged} />}
      {currentGameStart && (
        <div style={{ maxWidth: 600, overflowX: 'scroll' }}>
          <pre>{JSON.stringify(currentGameStart.event(), null, 2)}</pre>
        </div>
      )}
      {!currentGameStart && <div>No game?</div>}
    </div>
  )
}
