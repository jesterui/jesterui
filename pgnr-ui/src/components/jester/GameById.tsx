import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { useGameStore } from '../../context/GameEventStoreContext'

import * as JesterUtils from '../../util/jester'
import { GameStartEvent } from '../../util/app_db'

type Loading = undefined
type GameNotFound = null
type GameByIdResult = Loading | GameNotFound | GameStartEvent 

interface GameByIdProps {
  jesterId: JesterUtils.JesterId
   children: ((props: GameByIdResult) => React.ReactNode);
}

export function GameById({ jesterId, children }: GameByIdProps) {
  const gameStore = useGameStore()
  const [gameId] = useState(JesterUtils.jesterIdToGameId(jesterId))

  const game = useLiveQuery(
    async () => {
      if (!gameId) return null
      const event = await gameStore.game_start.get(gameId)
      return event || null
    },
    [gameId],
    undefined
  )

  return <>{(children as (game: GameByIdResult) => React.ReactNode)(game as GameByIdResult)}</>
}
