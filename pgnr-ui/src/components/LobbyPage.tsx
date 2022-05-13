import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import { GameStartOrNewIdentityButton } from '../components/GameStartOrNewIdentityButton'
import CreateDevelGameButton from '../components/devel/CreateDevelGameButton'
import CreateMultipleGamesButton from '../components/devel/CreateMultipleGamesButton'
import JesterId from '../components/jester/JesterId'
import { GameCard } from '../components/GameCard'
import { Spinner } from '../components/Spinner'
import { GameById } from '../components/jester/GameById'

import * as JesterUtils from '../util/jester'
import * as AppUtils from '../util/app'
import { getSession } from '../util/session'
import { GameStartEvent } from '../util/app_db'

// @ts-ignore
import Heading6 from '@material-tailwind/react/Heading6'
// @ts-ignore
import Small from '@material-tailwind/react/Small'
import { RoboHashImg } from './RoboHashImg'

const GAMES_FILTER_PAST_DURATION_IN_MINUTES = process.env.NODE_ENV === 'development' ? 30 : 5
const GAMES_FILTER_PAST_DURATION_IN_SECONDS = GAMES_FILTER_PAST_DURATION_IN_MINUTES * 60
const MAX_AMOUNT_OF_GAMES = 100
const MIN_UPDATE_IN_SECONDS = 10

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

interface GameListEntryProps {
  game: GameStartEvent
}

/*function GameListEntry({ game }: GameListEntryProps) {
  const jesterId = JesterUtils.gameIdToJesterId(game.id)
  const displayGameName = AppUtils.displayGameName(game)
  const displayPubKey = AppUtils.pubKeyDisplayName(game.pubkey)

  return (
    <Link to={`/game/${jesterId}`}>
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <RoboHashImg
            className="w-16 h-16 rounded-full shadow-lg-gray bg-blue-gray-500"
            value={game.pubkey}
            alt={displayPubKey}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            <JesterId jesterId={jesterId} />
          </p>
          <p className="text-sm text-gray-500 truncate">{displayPubKey}</p>
          <p className="text-sm text-gray-500 truncate">
            <Small color="yellow"> started at {new Date(game.created_at * 1_000).toLocaleString()}</Small>
          </p>
        </div>
        <div className="inline-flex items-center text-base font-semibold"></div>
      </div>
    </Link>
  )
}*/

function GameListEntry({ game }: GameListEntryProps) {
  const jesterId = JesterUtils.gameIdToJesterId(game.id)

  return <GameCard game={game} title={jesterId} />
}
interface GameListProps {
  games: GameStartEvent[]
}

function GameList(props: GameListProps) {
  return (
    <>
      {/*<div className=" max-w-md rounded-lg border border-gray-900 shadow-md p-4 ">*/}
      <div className="max-w-md rounded-lg ">
        <div className="flow-root">
          <ul>
            {props.games.map((game) => {
              return (
                <li
                  key={game.id}
                  className="px-4 py-3 mb-2 
                  rounded border border-gray-800 border-opacity-50 
                  shadow-sm hover:shadow-xl 
                  opacity-95 hover:opacity-100 
                  transform  duration-300
                  hover:-translate-y-1 hover:-translate-x-1
                  hover:transform-scale-101"
                >
                  <GameListEntry game={game} />
                </li>
              )
            })}
          </ul>
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

  const privateKeyOrNull = getSession()?.privateKey || null

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

  const listOfStartGamesLiveQuery = useLiveQuery(
    async () => {
      const events = await gameStore.game_start
        .where('created_at')
        .between(gameStartEventFilter.from.getTime() / 1_000, gameStartEventFilter.until.getTime() / 1_000)
        .limit(MAX_AMOUNT_OF_GAMES)
        .toArray()

      return events
    },
    [gameStartEventFilter],
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
        <div>No connection to nostr</div>
      ) : (
        <>
          <div className="flex justify-center my-4">
            {!settings.currentGameJesterId ? (
              <GameStartOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} />
            ) : (
              <>
                <GameById jesterId={settings.currentGameJesterId}>
                  {(game) => {
                    if (game === undefined) {
                      return (
                        <>
                          <Spinner />
                        </>
                      )
                    } else if (game === null) {
                      return (
                        <>
                          <GameStartOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} />
                        </>
                      )
                    } else {
                      return <GameCard game={game} />
                    }
                  }}
                </GameById>
              </>
            )}
          </div>

          <div className="my-4">
            {settings.dev && (
              <>
                <CreateDevelGameButton
                  onGameCreated={(e, jesterId) => {
                    window.alert(`Published game ${jesterId}`)
                  }}
                />
                <CreateMultipleGamesButton amount={21} />
              </>
            )}
          </div>
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
            <GameList games={listOfStartGamesLiveQuery || []} />
          </div>
        </>
      )}
    </div>
  )
}
