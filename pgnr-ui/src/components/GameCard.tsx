import React, { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { AppSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import { CurrentGameRedirectButtonHook } from '../components/CreateGameButton'

import * as JesterUtils from '../util/jester'
import * as AppUtils from '../util/app'
import { GameStartEvent } from '../util/app_db'

// @ts-ignore
import Small from '@material-tailwind/react/Small'
// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import Icon from '@material-tailwind/react/Icon'
import { GameById } from './jester/GameById'

/*
interface GameCardByIdProps {
  jesterId: JesterUtils.JesterId
}
export function GameCardById({ jesterId }: GameCardByIdProps) {
    return (<>
      <GameById jesterId={jesterId}>
        {(game) => {
           if (game === undefined) {
            return (<>
              <div>Loading...</div>
            </>)
          } else if (game === null) {
            return (<>
              <div>{`Game ${jesterId} not found...`}</div>
            </>)
          } else {
            return (<GameCard game={game} />)
          }
        }}
      </GameById>
    </>)
}*/

interface GameCardProps {
  game: GameStartEvent
  title?: string
}

export function GameCard({ game, title = 'Current Game'}: GameCardProps) {
  const gameStore = useGameStore()
  const settingsDispatch = useSettingsDispatch()
  const redirectToCurrentGameButtonRef = useRef<HTMLButtonElement>(null)
  const [jesterId] = useState(JesterUtils.gameIdToJesterId(game.id))

  const gameMoveCount = useLiveQuery(
    async () => {
      return await gameStore.game_move.where('gameId').equals(game.id).count()
    },
    [game],
    null
  )
  
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
              <h6 className="text-blue-gray-500 text-xl font-serif font-bold leading-normal mt-0 mb-1">{title}</h6>
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
          <div className="mb-1">
            <code className="border border-solid border-blue-gray-500 text-xs font-semibold mx-1 px-2.5 py-1 rounded">
              {displayJesterId}
            </code>
          </div>
        */}
          <span className="mb-1 text-sm text-gray-400">
            with {gameMoveCount === null ? ' ... ' : `${gameMoveCount}`} {gameMoveCount === 1 ? 'move' : 'moves'}
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