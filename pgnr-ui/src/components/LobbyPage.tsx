import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import { CurrentGameRedirectButtonHook } from '../components/CreateGameButton'
import { GameStartOrNewIdentityButton } from '../components/GameStartOrNewIdentityButton'
import CreateDevelGameButton from '../components/devel/CreateDevelGameButton'
import CreateMultipleGamesButton from '../components/devel/CreateMultipleGamesButton'
import JesterId from '../components/JesterId'

import * as JesterUtils from '../util/jester'
import * as AppUtils from '../util/app'
import { getSession } from '../util/session'
import { GameStartEvent } from '../util/app_db'

// @ts-ignore
import Heading6 from '@material-tailwind/react/Heading6'
// @ts-ignore
import Small from '@material-tailwind/react/Small'
// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import Icon from '@material-tailwind/react/Icon'

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

interface CurrentGameCardProps {
  game: GameStartEvent
  moveCount: number | null
}

function CurrentGameCard({ game, moveCount = 0 }: CurrentGameCardProps) {
  const settingsDispatch = useSettingsDispatch()
  const redirectToCurrentGameButtonRef = useRef<HTMLButtonElement>(null)

  const jesterId = JesterUtils.gameIdToJesterId(game.id)
  const displayPubKey = AppUtils.pubKeyDisplayName(game.pubkey)

  const unsubscribeFromCurrentGame = useCallback(() => {
    settingsDispatch({ currentGameJesterId: undefined } as AppSettings)
  }, [settingsDispatch])

  return (
    <Link to={`/game/${jesterId}`} className="w-full max-w-sm">
      <div
        className="rounded-lg border border-gray-800 shadow-sm hover:shadow-xl 
    transform duration-300 hover:transform-scale-103"
      >
        <div className="flex flex-col items-center pb-4 pt-4">
          <div className="flex items-center w-full">
            <div className="flex-none w-14"></div>
            <div className="grow flex justify-center">
              <h6 className="text-blue-gray-500 text-xl font-serif font-bold leading-normal mt-0 mb-1">Current Game</h6>
            </div>
            <div className="flex-none w-14">
              <Button
                color="gray"
                buttonType="link"
                size="regular"
                rounded={false}
                block={false}
                iconOnly={true}
                ripple="light"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  unsubscribeFromCurrentGame()
                }}
              >
                <Icon name="close" size="xl" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4 my-4">
            <img
              className="w-24 h-24 rounded-full shadow-lg-gray bg-blue-gray-500"
              src={`https://robohash.org/${game.pubkey}`}
              alt={displayPubKey}
            />
            <div className="text-xl font-medium">vs.</div>
            <img
              className="w-24 h-24 rounded-full shadow-lg-gray bg-blue-gray-500"
              src={`https://robohash.org/${game.id}`}
              alt={displayPubKey}
            />
          </div>

          {/*
          <h6 className="mb-1 text-xl font-medium">{displayPubKey}</h6>
          <span className="mb-1 text-sm text-gray-400">
            with {moveCount} {moveCount === 1 ? 'move' : 'moves'}
          </span>
          <span className="mb-1 text-sm text-gray-400">
            <Small color="yellow"> Started at {new Date(game.created_at * 1_000).toLocaleString()}</Small>
          </span>
        */}

          {/*
          <div className="mb-1">
            <code className="border border-solid border-blue-gray-500 text-xs font-semibold mx-1 px-2.5 py-1 rounded">
              {displayJesterId}
            </code>
          </div>
        */}
          <span className="mb-1 text-sm text-gray-400">
            with {moveCount} {moveCount === 1 ? 'move' : 'moves'}
          </span>
          <span className="mb-1 text-sm text-gray-400">
            <Small color="yellow"> Started at {new Date(game.created_at * 1_000).toLocaleString()}</Small>
          </span>
          <div className="px-4 mt-2 w-full">
            <Button
              color="green"
              buttonType="filled"
              size="regular"
              rounded={false}
              block={true}
              iconOnly={false}
              ripple="dark"
              ref={redirectToCurrentGameButtonRef}
            >
              Play
              <CurrentGameRedirectButtonHook buttonRef={redirectToCurrentGameButtonRef} jesterId={jesterId} />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}

interface GameListEntryProps {
  game: GameStartEvent
}

function GameListEntry({ game }: GameListEntryProps) {
  const jesterId = JesterUtils.gameIdToJesterId(game.id)
  const displayGameName = AppUtils.displayGameName(game)
  const displayPubKey = AppUtils.pubKeyDisplayName(game.pubkey)

  return (
    <Link to={`/game/${jesterId}`}>
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <img
            className="w-16 h-16 rounded-full shadow-lg-gray bg-blue-gray-500"
            src={`https://robohash.org/${game.pubkey}`}
            alt="Neil image"
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
          <ul role="list">
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

  const currentGameLiveQuery = useLiveQuery(
    async () => {
      if (!settings.currentGameJesterId) return null

      const currentGameId = JesterUtils.jesterIdToGameId(settings.currentGameJesterId)

      const event = await gameStore.game_start.get(currentGameId)
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
            {!currentGameLiveQuery ? (
              <GameStartOrNewIdentityButton hasPrivateKey={!!privateKeyOrNull} />
            ) : (
              <CurrentGameCard game={currentGameLiveQuery} moveCount={currentGameMoveCountLiveQuery} />
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
