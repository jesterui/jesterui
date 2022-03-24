import React, { useEffect, useState } from 'react'

import { useCurrentGame, useSetCurrentGame, Game } from '../context/GamesContext'
import BoardById from './GameById'

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
import * as cg from 'chessground/types'

export default function Index() {
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const outgoingNostr = useOutgoingNostrEvents()
  const currentGame = useCurrentGame()
  const setCurrentGame = useSetCurrentGame()
  const settings = useSettings()

  const [currentGameEvent, setCurrentGameEvent] = useState<NIP01.Event | null>(null)

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

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

  return (
    <div className="screen-index">
      <Heading1 color="blueGray">Gameboard</Heading1>
      {
        <button type="button" onClick={() => onStartGameButtonClicked()}>
          Start new game
        </button>
      }
      {currentGame && <BoardById gameId={currentGame.id} />}
      {currentGameEvent && (
        <div>
          <pre>{JSON.stringify(currentGameEvent, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
