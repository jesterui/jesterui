import Dexie, { Table } from 'dexie'

import * as NIP01 from '../util/nostr/nip01'

export interface NostrEvent extends NIP01.Event {}

export interface NostrEventRef {
  sourceId: NIP01.EventId
  targetIds: NIP01.EventId[]
}

export class AppNostrDexie extends Dexie {
  nostr_events!: Table<NostrEvent>
  nostr_event_refs!: Table<NostrEventRef>

  constructor() {
    super('app_nostr')
    this.version(1).stores({
      nostr_events: '&id, pubkey, created_at', // primary key and indexed props
      nostr_event_refs: '&sourceId, *targetIds', // unique primary key and array of keys (Multi-valued)
      //nostr_pubkey_refs: '&sourceId, *targetIds',
    })
  }
}

export const db = new AppNostrDexie()
