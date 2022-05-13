import React from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { useGameStore } from '../../context/GameEventStoreContext'

import { GameStartEvent } from '../../util/app_db'
import { PubKey } from '../../util/nostr/nip01'

type GameDetailsResult = {
  moveCount: number | null
  player1PubKey: PubKey
  player2PubKey: PubKey | null
}

interface GameDetailsProps {
  game: GameStartEvent
  children: (props: GameDetailsResult) => React.ReactNode
}

export function GameDetails({ game, children }: GameDetailsProps) {
  const gameStore = useGameStore()

  const moveCount = useLiveQuery(
    async () => {
      return await gameStore.game_move.where('gameId').equals(game.id).count()
    },
    [game],
    null
  )

  const player1PubKey = game.pubkey
  const player2PubKey = useLiveQuery(
    async () => {
      if (!game) return null
      const event = await gameStore.game_move.where('[gameId+moveCounter]').equals([game.id, 2]).first()

      return (event && event.pubkey) || null
    },
    [game],
    null
  )

  return (
    <>
      {(children as (game: GameDetailsResult) => React.ReactNode)({
        moveCount,
        player1PubKey,
        player2PubKey,
      } as GameDetailsResult)}
    </>
  )
}
