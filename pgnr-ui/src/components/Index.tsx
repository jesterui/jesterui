import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCurrentGame, useSetCurrentGame } from '../context/GamesContext'
import BoardById from './GameById'
import CreateGameButton from './CreateGameButton'

import { useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Chess from 'chess.js'
import * as cg from 'chessground/types'

export default function Index() {
  const navigate = useNavigate()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const currentGame = useCurrentGame()
  const setCurrentGame = useSetCurrentGame()

  const [currentGameEvent, setCurrentGameEvent] = useState<NIP01.Event | null>(null)

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

  const onGameCreated = (gameId: NIP01.Sha256) => {
    navigate(`/game:/${gameId}`)
  }

  return (
    <div className="screen-index">
      <Heading1 color="blueGray">Gameboard</Heading1>
      {!currentGame && <CreateGameButton onGameCreated={onGameCreated} />}
      {currentGame && <BoardById gameId={currentGame.id} />}
      {currentGameEvent && (
        <div>
          <pre>{JSON.stringify(currentGameEvent, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
