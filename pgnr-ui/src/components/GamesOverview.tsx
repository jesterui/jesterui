import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import CreateGameButton from './CreateGameButton'

import { useIncomingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'

export default function GamesOverview() {
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()

  const [games, setGames] = useState<NIP01.Event[]>([])

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

      {!incomingNostr ? (
        <>
          <div>No connection to nostr</div>
        </>
      ) : (
        <>
          <CreateGameButton onGameCreated={onGameCreated} />
          {games.length === 0 && <div>No Games available</div>}
          {games.map((it) => {
            return (
              <div>
                <Link to={`/game/${it.id}`}>{AppUtils.gameDisplayName(it.id)}</Link>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
