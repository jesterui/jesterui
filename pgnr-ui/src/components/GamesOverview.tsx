import React, { useEffect, useRef, useState, MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import CreateGameButton from './CreateGameButton'

import { useIncomingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
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
  const createGameButtonRef = useRef<HTMLButtonElement>(null)
  const settings = useSettings()
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()

  const [games, setGames] = useState<GameSummary[]>([])

  // TODO:  can lead to game overview not rendered because of "too many start events"
  useEffect(() => {
    const abortCtrl = new AbortController()
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return
      const bufferState = incomingNostrBuffer.state()

      // TODO: defer here... should not iterate over all events everytime..
      const orderedGameStartedEvents = bufferState.order
        .map((eventId) => bufferState.events[eventId])
        .filter((event) => AppUtils.isStartGameEvent(event))
        .map((event) => ({
          event,
          refCount: bufferState.refs[event.id].length,
          createdAt: new Date(event.created_at * 1_000),
        }))

      setGames(orderedGameStartedEvents)
    }, 10)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [incomingNostrBuffer])

  const onGameCreated = (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.Sha256) => {
    if (e.nativeEvent.isTrusted) {
      navigate(`/game/${gameId}`)
    }
  }

  const __dev_createMultipleGames = (amount: number) => {
    if (amount <= 0) return

    const chunks = 10

    if (amount <= chunks) {
      for (let i = 0; i < amount; i++) {
        //setTimeout(() => createGameButtonRef.current?.click(), i + 1)
        createGameButtonRef.current?.click()
      }
    } else {
      __dev_createMultipleGames(chunks)
      setTimeout(() => __dev_createMultipleGames(amount - chunks), 4)
    }
  }

  return (
    <div className="screen-games-overview">
      <Heading1 color="blueGray">Games</Heading1>

      {!incomingNostr ? (
        <div>No connection to nostr</div>
      ) : (
        <>
          <CreateGameButton buttonRef={createGameButtonRef} onGameCreated={onGameCreated} />
          {settings.dev && <button
      type="button"
      className="bg-white bg-opacity-20 rounded px-2 py-1 mx-1"
      onClick={() => __dev_createMultipleGames(100)}
    >
      DEV: Start 100 games
    </button>}

          {games.length === 0 && <div>No Games available</div>}
          {games.length > 0 && <div>{games.length} games available</div>}
          <div className="my-4">
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
          </div>
        </>
      )}
    </div>
  )
}
