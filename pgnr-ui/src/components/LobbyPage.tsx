import React, { useEffect, useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import { GameStartOrNewIdentityButton } from '../components/GameStartOrNewIdentityButton'
import CreateDevelGameButton from '../components/devel/CreateDevelGameButton'
import CreateMultipleGamesButton from '../components/devel/CreateMultipleGamesButton'
import { GameCard } from '../components/GameCard'
import { Spinner } from '../components/Spinner'
import { GameById } from '../components/jester/GameById'
import { NoConnectionAlert } from '../components/NoConnectionAlert'

import { getSession } from '../util/session'
import { GameStartEvent } from '../util/app_db'
import * as NIP01 from '../util/nostr/nip01'
import { jesterIdToGameId, jesterPrivateStartGameRef } from '../util/jester'

// @ts-ignore
import Heading6 from '@material-tailwind/react/Heading6'
// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import Icon from '@material-tailwind/react/Icon'

const GAMES_FILTER_PAST_DURATION_IN_MINUTES = process.env.NODE_ENV === 'development' ? 10 : 10
const GAMES_FILTER_PAST_DURATION_IN_SECONDS = GAMES_FILTER_PAST_DURATION_IN_MINUTES * 60
const INITIAL_MAX_AMOUNT_OF_GAMES = 21
const MIN_UPDATE_IN_SECONDS = 60

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

interface GameListProps {
  games: GameStartEvent[]
  currentGameId?: string
}

function GameList(props: GameListProps) {
  return (
    <>
      <div className="w-full max-w-md rounded-lg ">
        <div className="grid justify-items-center items-center gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {props.games.map((game) => {
            const isCurrentGame = game.id === props.currentGameId
            return (
              <div key={game.id} className="w-full max-w-sm">
                <GameCard game={game} isCurrentGame={isCurrentGame} />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function LobbyPage() {
  const renderedAt = new Date()
  const settings = useSettings()
  const incomingNostr = useIncomingNostrEvents()
  const gameStore = useGameStore()
  const [gameStartEventFilter, setGameStartEventFilter] = useState(createGameOverviewFilter(new Date()))
  const currentGameId: NIP01.EventId | undefined = useMemo(
    () => settings.currentGameJesterId && jesterIdToGameId(settings.currentGameJesterId),
    [settings]
  )

  const [maxAmountOfGamesDisplayed, setMaxAmountOfGamesDisplayed] = useState<number>(INITIAL_MAX_AMOUNT_OF_GAMES)

  const publicKeyOrNull: NIP01.PubKey | null = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  const privateStartGameRef: NIP01.EventId | null = useMemo(
    () => publicKeyOrNull && jesterPrivateStartGameRef(publicKeyOrNull),
    [publicKeyOrNull]
  )

  const [tick, setTick] = useState<number>(Date.now())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    setGameStartEventFilter(createGameOverviewFilter(new Date()))

    setIsLoading(true)
    const abortCtrl = new AbortController()
    const timer = setTimeout(() => !abortCtrl.signal.aborted && setIsLoading(false), 1_000)

    return () => {
      clearTimeout(timer)
      abortCtrl.abort()
    }
  }, [tick])

  useEffect(() => {
    const abortCtrl = new AbortController()
    const updateInterval = setInterval(
      () => !abortCtrl.signal.aborted && setTick(Date.now()),
      MIN_UPDATE_IN_SECONDS * 1_000
    )
    return () => {
      clearInterval(updateInterval)
      abortCtrl.abort()
    }
  }, [])

  const onRefreshGameListButtonClicked = () => {
    setTick(Date.now())
  }
  const onLoadMoreGamesButtonClicked = () => {
    setMaxAmountOfGamesDisplayed((current) => current + INITIAL_MAX_AMOUNT_OF_GAMES)
  }

  const listOfStartGamesLiveQuery = useLiveQuery(
    async () => {
      const events = await gameStore.game_start
        .where('created_at')
        .between(gameStartEventFilter.from.getTime() / 1_000, gameStartEventFilter.until.getTime() / 1_000)
        .limit(maxAmountOfGamesDisplayed)
        .toArray()

      return events
    },
    [gameStartEventFilter, maxAmountOfGamesDisplayed],
    null
  )

  const listOfStartGames = useMemo(() => {
    return listOfStartGamesLiveQuery
  }, [listOfStartGamesLiveQuery])

  const listOfPrivateStartGamesLiveQuery = useLiveQuery(
    async () => {
      if (!privateStartGameRef) return null
      const events = await gameStore.game_start.where('event_tags').equals(privateStartGameRef).limit(12).toArray()

      return events
    },
    [privateStartGameRef],
    null
  )

  useEffect(() => {
    const previousTitle = document.title
    if (!listOfStartGamesLiveQuery || listOfStartGamesLiveQuery.length === 0) {
      document.title = `Lobby`
    } else {
      document.title = `Lobby (${listOfStartGamesLiveQuery.length})`
    }

    return () => {
      document.title = previousTitle
    }
  }, [listOfStartGamesLiveQuery])

  return (
    <div className="screen-games-overview">
      {!incomingNostr ? (
        <NoConnectionAlert />
      ) : (
        <>
          <div className="flex justify-center my-4">
            {!settings.currentGameJesterId ? (
              <GameStartOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} />
            ) : (
              <GameById jesterId={settings.currentGameJesterId}>
                {(game) => {
                  if (game === undefined) {
                    return <Spinner />
                  } else if (game === null) {
                    return <GameStartOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} />
                  } else {
                    return <></>
                  }
                }}
              </GameById>
            )}
          </div>

          {process.env.NODE_ENV === 'development' && settings.dev && (
            <div className="my-4">
              <CreateDevelGameButton
                onGameCreated={(e, jesterId) => {
                  window.alert(`Published game ${jesterId}`)
                }}
              />
              <CreateMultipleGamesButton amount={21} />
            </div>
          )}

          {listOfPrivateStartGamesLiveQuery && listOfPrivateStartGamesLiveQuery.length > 0 && (
            <>
              <div className="my-4">
                <Heading6 color="blueGray">
                  Direct Challenges ({listOfPrivateStartGamesLiveQuery?.length || 0})
                </Heading6>
              </div>
              <div className="my-4">
                <GameList games={listOfPrivateStartGamesLiveQuery || []} currentGameId={currentGameId} />
              </div>
            </>
          )}

          <div className="my-4">
            <Heading6 color="blueGray">
              Latest Games (
              {listOfStartGames && listOfStartGames.length >= maxAmountOfGamesDisplayed
                ? `>${maxAmountOfGamesDisplayed}`
                : `${listOfStartGames?.length || 0}`}
              )
            </Heading6>

            <div className="flex items-center">
              <div className="text-sm text-gray-500 font-serif font-bold leading-normal mt-0 mb-1">
                <div>
                  {`${listOfStartGames?.length || 0}`} games available in the last{' '}
                  {Math.floor((renderedAt.getTime() - gameStartEventFilter.from.getTime()) / 1_000 / 60)} minutes
                </div>
                <div> on {renderedAt.toLocaleString()}</div>
              </div>

              <div>
                <Button
                  color="blueGray"
                  buttonType="outline"
                  size="sm"
                  rounded={false}
                  block={false}
                  iconOnly={false}
                  ripple="light"
                  onClick={onRefreshGameListButtonClicked}
                  className="mx-4 h-8 "
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-center">
                    <div className="w-6 flex items-center justify-center">
                      {isLoading ? <Spinner size={16} /> : <Icon name="refresh" size="xl" />}
                    </div>
                    <div className="ml-2">Refresh</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 mb-24">
            <GameList games={listOfStartGames || []} currentGameId={currentGameId} />

            {listOfStartGames !== null && listOfStartGames.length === 0 && (
              <div className="flex items-center gap-3 text-white p-4 pr-12 border-0 bg-gray-500 bg-opacity-20 rounded-lg relative mb-4 transition-all duration-300">
                <div className="text-gray-500">Currently, no games are being played.</div>
                {isLoading && <Spinner size={24} />}
              </div>
            )}

            {listOfStartGames && listOfStartGames.length >= maxAmountOfGamesDisplayed && (
              <div className="flex justify-center my-4">
                <Button
                  color="blueGray"
                  buttonType="outline"
                  size="xl"
                  rounded={false}
                  block={false}
                  iconOnly={false}
                  ripple="light"
                  onClick={onLoadMoreGamesButtonClicked}
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-center">
                    <div className="w-6 flex items-center justify-center">
                      {isLoading ? <Spinner size={16} /> : <Icon name="refresh" size="xl" />}
                    </div>
                    <div className="ml-2">Load more</div>
                  </div>
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
