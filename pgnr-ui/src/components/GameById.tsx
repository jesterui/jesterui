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
import CreateGameButton from './CreateGameButton'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance } from '../components/ChessJsTypes'
import * as cg from 'chessground/types'

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
      {game && (
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

  const [currentGame, setCurrentGame] = useState<Game | null>(null)

  // TODO: "isLoading" is more like "isWaiting",.. e.g. no game is found.. can be in incoming events the next second,
  // in 10 seconds, or never..
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [myMoveIds, setMyMoveIds] = useState<NIP01.Sha256[]>([])
  const [currentGameStartEvent, setCurrentGameStartEvent] = useState<NIP01.Event | null>(null)

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

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const eventParts = NostrEvents.blankEvent()
    eventParts.kind = 1 // text_note
    eventParts.pubkey = publicKey
    eventParts.created_at = Math.floor(Date.now() / 1000)
    eventParts.content = chessboard.fen()
    eventParts.tags = [['e', currentGame.id]]
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
      setCurrentGameStartEvent(null)
    }
  }, [gameId])

  // when the gamId changes, or new events arrive, set
  useEffect(() => {
    if (!gameId) return
    if (currentGameStartEvent) return

    const bufferState = incomingNostrBuffer.state()
    const gameEvent = bufferState.events[gameId]
    const isValidGameStartEvent = gameEvent && AppUtils.isStartGameEvent(gameEvent)

    if (isValidGameStartEvent) {
      setCurrentGameStartEvent(gameEvent)
    }
  }, [gameId, currentGameStartEvent, incomingNostrBuffer])

  useEffect(() => {
    if (!currentGameStartEvent) {
      setCurrentGame(null)
    } else {
      const color = ['white', 'black'][Math.floor(Math.random() * 2)] as cg.Color
      setCurrentGame((_) => ({
        id: currentGameStartEvent.id,
        game: new Chess(),
        color: ['white', 'black'] || [color], // TODO: currently make it possible to move both colors
      }))
    }
  }, [currentGameStartEvent])

  useEffect(() => {
    if (!currentGameStartEvent) return
    const currentGameFilter = AppUtils.createGameFilter(currentGameStartEvent)

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
  }, [currentGameStartEvent, settingsDispatch])

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
      {currentGameStartEvent && (
        <div>
          <pre>{JSON.stringify(currentGameStartEvent, null, 2)}</pre>
        </div>
      )}
      {!currentGameStartEvent && <div>No game?</div>}
    </div>
  )
}
