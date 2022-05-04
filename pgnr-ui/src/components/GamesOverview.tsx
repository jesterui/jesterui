import React, { useEffect, useState, MouseEvent, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useLiveQuery } from 'dexie-react-hooks'
import CreateGameButton from './CreateGameButton'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useGameStore } from '../context/GameEventStoreContext'
import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/jester'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Heading6 from '@material-tailwind/react/Heading6'
// @ts-ignore
import Small from '@material-tailwind/react/Small'
import CreateDevelGameButton from './devel/CreateDevelGameButton'
import CreateMultipleGamesButton from './devel/CreateMultipleGamesButton'

const GAMES_FILTER_PAST_DURATION_IN_MINUTES = process.env.NODE_ENV === 'development' ? 30 : 5
const GAMES_FILTER_PAST_DURATION_IN_SECONDS = GAMES_FILTER_PAST_DURATION_IN_MINUTES * 60
const MIN_UPDATE_IN_SECONDS = 10

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

const createGameOverviewFilter = (now: Date) => {
  const from = new Date(now.getTime() - GAMES_FILTER_PAST_DURATION_IN_SECONDS * 1_000)
  const until = new Date(now.getTime() + GAMES_FILTER_PAST_DURATION_IN_SECONDS * 1_000)

  return {
    from: from,
    until: until,
  } as GamesFilter
}

export default function GamesOverview() {
  const renderedAt = new Date()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const gameStore = useGameStore()
  const [gameStartEventFilter, setGameStartEventFilter] = useState(createGameOverviewFilter(new Date()))

  const [tick, setTick] = useState<number>(Date.now())

  useEffect(() => {
    setGameStartEventFilter(createGameOverviewFilter(new Date()))
  }, [tick])

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

  const currentGameLiveQuery = useLiveQuery(
    async () => {
      if (!settings.currentGameId) return null

      const event = await gameStore.game_start.get(settings.currentGameId)
      return event || null
    },
    [settings],
    null
  )

  const currentGameMoveCountLiveQuery = useLiveQuery(
    async () => {
      if (!currentGameLiveQuery) return null

      return await gameStore.game_move.where('gameId').equals(currentGameLiveQuery.id).count()
    },
    [currentGameLiveQuery],
    null
  )

  const listOfStartGamesLiveQuery = useLiveQuery(
    async () => {
      const events = await gameStore.game_start
        .where('created_at')
        .between(gameStartEventFilter.from.getTime() / 1_000, gameStartEventFilter.until.getTime() / 1_000)
        .toArray()

      return events
    },
    [gameStartEventFilter],
    null
  )

  useEffect(() => {
    const previousTitle = document.title
    if (!listOfStartGamesLiveQuery) {
      document.title = `jester - Overview (...)`
    } else {
      document.title = `jester - Overview (${listOfStartGamesLiveQuery.length})`
    }

    return () => {
      document.title = previousTitle
    }
  }, [listOfStartGamesLiveQuery])

  const onGameCreated = (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.Sha256) => {
    if (e.nativeEvent.isTrusted) {
      navigate(`/game/${gameId}`)
    }
  }

  const unsubscribeFromCurrentGame = useCallback(() => {
    settingsDispatch({ currentGameId: undefined } as AppSettings)
  }, [settingsDispatch])

  return (
    <div className="screen-games-overview">
      <Heading1 color="blueGray">Games</Heading1>

      <div>{/*JSON.stringify(listOfStartGamesLiveQuery)*/}</div>

      {!incomingNostr ? (
        <div>No connection to nostr</div>
      ) : (
        <>
          <div className="my-4">
            {settings.dev && (
              <>
                <CreateDevelGameButton
                  onGameCreated={(e, gameId) => {
                    window.alert(`Published game ${gameId}`)
                  }}
                />
                <CreateMultipleGamesButton amount={21} />
              </>
            )}
          </div>

          {
            <div className="my-4">
              <Heading6 color="blueGray">Current Game</Heading6>
              {!currentGameLiveQuery && <CreateGameButton onGameCreated={onGameCreated} />}
              {currentGameLiveQuery && (
                <>
                  <div>
                    <Link to={`/game/${currentGameLiveQuery.id}`}>
                      <>
                        <span className="font-mono px-2">{AppUtils.gameDisplayName(currentGameLiveQuery.id)}</span>
                        {/*it.refCount > 0 && <Small color="lightGreen"> with {it.refCount} events</Small>*/}
                        <Small color="green"> with {currentGameMoveCountLiveQuery} events</Small>
                        <Small color="gray">
                          {' '}
                          started by{' '}
                          <span className="font-mono">{AppUtils.pubKeyDisplayName(currentGameLiveQuery.pubkey)}</span>
                        </Small>
                        <Small color="yellow">
                          {' '}
                          at {new Date(currentGameLiveQuery.created_at * 1_000).toLocaleString()}
                        </Small>
                      </>
                    </Link>
                    <button
                      type="button"
                      className="bg-white bg-opacity-20 rounded px-2 py-1 mx-1"
                      onClick={() => unsubscribeFromCurrentGame()}
                    >
                      Unsubscribe
                    </button>
                  </div>
                </>
              )}
            </div>
          }

          {
            <div className="my-4">
              <Heading6 color="blueGray">Latest Games</Heading6>
              {listOfStartGamesLiveQuery?.length || 0} games available
              <Small color="yellow"> on {renderedAt.toLocaleString()}</Small>
              <Small color="gray"> from {gameStartEventFilter.from.toLocaleString()}</Small>
              <Small color="gray"> to {gameStartEventFilter.until.toLocaleString()}</Small>
            </div>
          }
          <div className="my-4">
            {listOfStartGamesLiveQuery?.map((it) => {
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
