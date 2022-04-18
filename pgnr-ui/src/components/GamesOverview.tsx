import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import CreateGameButton from './CreateGameButton'

import { useIncomingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Small from '@material-tailwind/react/Small'

interface GameSummary {
  event: NIP01.Event
  refCount: number
  createdAt: Date
}

export default function GamesOverview() {
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()

  const [games, setGames] = useState<GameSummary[]>([])

  useEffect(() => {
    const bufferState = incomingNostrBuffer.state()

    // TODO: defer here... should not iterate over all events everytime..
    const orderedGameStartedEvents = bufferState.order
      .map((eventId) => bufferState.events[eventId])
      .filter((event) => AppUtils.isStartGameEvent(event))
      .map((event) => ({
        event,
        refCount: bufferState.refs[event.id].length,
        createdAt: new Date(event.created_at * 1000),
      }))

    setGames(orderedGameStartedEvents)
  }, [incomingNostrBuffer])

  const onGameCreated = (gameId: NIP01.Sha256) => {
    navigate(`/game/${gameId}`)
  }

  return (
    <div className="screen-games-overview">
      <Heading1 color="blueGray">Games</Heading1>

      {!incomingNostr ? (
        <div>No connection to nostr</div>
      ) : (
        <>
          <CreateGameButton onGameCreated={onGameCreated} />
          {games.length === 0 && <div>No Games available</div>}
          {games.map((it) => {
            return (
              <div key={it.event.id}>
                <Link to={`/game/${it.event.id}`}>
                  <>
                    <span className="font-mono px-2">{AppUtils.gameDisplayName(it.event.id)}</span>
                    {it.refCount > 0 && <Small color="lightGreen"> with {it.refCount} events</Small>}
                    <Small color="gray">
                      {' '}
                      started by <span className="font-mono">{AppUtils.pubKeyDisplayName(it.event.pubkey)}</span>
                    </Small>
                    <Small color="yellow"> at {it.createdAt.toLocaleString()}</Small>
                  </>
                </Link>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
