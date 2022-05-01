import React, { useEffect, useRef, useState, MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NostrEvent } from '../util/nostr_db'

import { useLiveQuery } from 'dexie-react-hooks'
import CreateGameButton from './CreateGameButton'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
import { useGameStore } from '../context/GameEventStoreContext'
import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Small from '@material-tailwind/react/Small'

const GAMES_FILTER_PAST_DURATION_IN_MINUTES = process.env.NODE_ENV === 'development' ? 30 : 5
const GAMES_FILTER_PAST_DURATION_IN_SECONDS = GAMES_FILTER_PAST_DURATION_IN_MINUTES * 60
const MIN_UPDATE_IN_SECONDS = 60

/*
interface GameSummary {
  event: NIP01.Event
  refCount: number
  createdAt: Date
}*/

interface GamesFilter {
  from: Date
  until: Date
}

const createGamesFilter = (now: Date) => {
  const from = new Date(now.getTime() - GAMES_FILTER_PAST_DURATION_IN_SECONDS * 1_000)
  const until = new Date(now.getTime() + GAMES_FILTER_PAST_DURATION_IN_SECONDS * 1_000)

  return {
    from: from,
    until: until,
  } as GamesFilter
}

export default function GamesOverview() {
  const createGameButtonRef = useRef<HTMLButtonElement>(null)
  const settings = useSettings()
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()


  const [filter, setFilter] = useState(createGamesFilter(new Date()))
  const [tick, setTick] = useState<number>(Date.now())
  useEffect(() => {
    setFilter(createGamesFilter(new Date()))
  }, [tick])

  const db = useGameStore()

  const listOfStartGamesLiveQuery = useLiveQuery(
    async () => {
      const events = (
        await db.game_start
          .where('created_at')
          .between(filter.from.getTime() / 1_000, filter.until.getTime() / 1_000)
          .toArray()
      )

      return events
    },
    [filter],
    [] as NostrEvent[]
  )

  const renderedAt = new Date()

  useEffect(() => {
    const abortCtrl = new AbortController()
    const timer = setInterval(
      () => !abortCtrl.signal.aborted && setTick((_) => Date.now()),
      MIN_UPDATE_IN_SECONDS * 1_000
    )
    return () => {
      clearInterval(timer)
      abortCtrl.abort()
    }
  }, [])

  // TODO:  can lead to game overview not rendered because of "too many start events"
  /*useEffect(() => {
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
  }, [incomingNostrBuffer])*/

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

      <div>{/*JSON.stringify(listOfStartGamesLiveQuery)*/}</div>

      {!incomingNostr ? (
        <div>No connection to nostr</div>
      ) : (
        <>
          <CreateGameButton buttonRef={createGameButtonRef} onGameCreated={onGameCreated} />
          {settings.dev && (
            <button
              type="button"
              className="bg-white bg-opacity-20 rounded px-2 py-1 mx-1"
              onClick={() => __dev_createMultipleGames(100)}
            >
              DEV: Start 100 games
            </button>
          )}

          {
            <div>
              {listOfStartGamesLiveQuery.length} games available
              <Small color="yellow"> on {renderedAt.toLocaleString()}</Small>
              <Small color="gray"> from {filter.from.toLocaleString()}</Small>
              <Small color="gray"> to {filter.until.toLocaleString()}</Small>
            </div>
          }
          <div className="my-4">
            {listOfStartGamesLiveQuery.map((it) => {
              return (
                <div key={it.id}>
                  <Link to={`/game/${it.id}`}>
                    <>
                      <span className="font-mono px-2">{AppUtils.gameDisplayName(it.id)}</span>
                      {/*it.refCount > 0 && <Small color="lightGreen"> with {it.refCount} events</Small>*/}
                      <Small color="gray">
                        {' '}
                        started by <span className="font-mono">{AppUtils.pubKeyDisplayName(it.pubkey)}</span>
                      </Small>
                      <Small color="yellow"> at {new Date(it.created_at * 1_000).toLocaleString()}</Small>
                      <Small color="gray">{it.created_at * 1_000}</Small>
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
