import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import CreateGameButton from './CreateGameButton'

import { useSettings } from '../context/SettingsContext'
import { useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { getSession } from '../util/session'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'

export default function GamesOverview() {
  const navigate = useNavigate()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const settings = useSettings()

  const [games, setGames] = useState<NIP01.Event[]>([])

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  useEffect(() => {
    const bufferState = incomingNostrBuffer.state()

    // TODO: defer here... should not iterate over all events everytime..
    const orderedGameStartedEvents = bufferState.order
      .map((eventId) => bufferState.events[eventId])
      .filter((event) => AppUtils.isStartGameEvent(event))

    setGames(orderedGameStartedEvents)
  }, [incomingNostrBuffer])

  const onGameCreated = (gameId: NIP01.Sha256) => {
    navigate(`/game:/${gameId}`)
  }

  return (
    <div className="screen-games-overview">
      <Heading1 color="blueGray">Games</Heading1>
      <CreateGameButton onGameCreated={onGameCreated} />
      {games.length === 0 && <div>No Games available</div>}
      {games.map((it) => {
        return (
          <div>
            <Link to={`/game/${it.id}`}>{it.id}</Link>
          </div>
        )
      })}
    </div>
  )
}
