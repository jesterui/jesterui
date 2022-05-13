import Dexie, { Table } from 'dexie'
import * as NIP01 from './nostr/nip01'

export interface GameStartEvent extends NIP01.Event {
  event_tags: NIP01.EventId[]
}

export interface GameMoveEvent extends NIP01.Event {
  gameId: NIP01.EventId
  moveCounter: number
  parentMoveId: NIP01.EventId | null
}

export class AppDexie extends Dexie {
  game_start!: Table<GameStartEvent>
  game_move!: Table<GameMoveEvent>

  constructor() {
    super('app_game_events')
    this.version(1).stores({
      game_start: '&id, pubkey, created_at, *event_tags',
      game_move: '&id, gameId, parentMoveId, [gameId+moveCounter]',
    })
  }
}

export const db = new AppDexie()
