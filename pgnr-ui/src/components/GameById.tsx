import React, { useEffect, useState } from 'react'

import { useCurrentGame, useSetCurrentGame, Game } from '../context/GamesContext'
import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'
import { useParams } from 'react-router-dom'

import { useSettings } from '../context/SettingsContext'
import { useOutgoingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { getSession } from '../util/session'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance } from '../components/ChessJsTypes'
import * as cg from 'chessground/types'

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

  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const outgoingNostr = useOutgoingNostrEvents()
  const currentGame = useCurrentGame()
  const setCurrentGame = useSetCurrentGame()
  const settings = useSettings()

  const [myMoveIds, setMyMoveIds] = useState<NIP01.Sha256[]>([])
  const [currentGameEvent, setCurrentGameEvent] = useState<NIP01.Event | null>(null)

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

  const onStartGameButtonClicked = async () => {
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

    const event = AppUtils.constructStartGameEvent(publicKey)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
  }

  // if no game is active, search the events if a game has been started
  // search from the newest element on and set the game to it
  useEffect(() => {
    // TODO: what if game is over? `currentGame.game.game_over()`
    if (currentGame) return

    const bufferState = incomingNostrBuffer.state()

    for (const eventId of bufferState.order) {
      const event = bufferState.events[eventId]

      if (AppUtils.isStartGameEvent(event)) {
        const color = ['white', 'black'][Math.floor(Math.random() * 2)] as cg.Color
        setCurrentGame((_) => ({
          id: event.id,
          game: new Chess(),
          color: ['white', 'black'] || [color], // TODO: currently make it possible to move both colors
        }))

        break
      }
    }
  }, [incomingNostrBuffer, currentGame])

  useEffect(() => {
    if (!currentGame) {
      setCurrentGameEvent(null)
    } else {
      const bufferState = incomingNostrBuffer.state()
      setCurrentGameEvent(bufferState.events[currentGame.id])
    }
  }, [currentGame])

  if (!gameId) {
    return <div>Error: GameId not present</div>
  }

  return (
    <div className="screen-index">
      <Heading1 color="blueGray">Game</Heading1>
      <div>{gameId}</div>
      {!currentGame && (
        <button type="button" onClick={() => onStartGameButtonClicked()}>
          Start new game
        </button>
      )}
      {currentGame && <BoardContainer game={currentGame} onGameChanged={onChessboardChanged} />}
      {currentGameEvent && (
        <div>
          <pre>{JSON.stringify(currentGameEvent, null, 2)}</pre>
        </div>
      )}
      {!currentGameEvent && <div>No game?</div>}
    </div>
  )
}
