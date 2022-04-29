
import Dexie, { Table } from 'dexie';
import * as NIP01 from './nostr/nip01'

export interface NostrEvent extends NIP01.Event {
}
/*export interface NostrEventRef {
  sourceId: NIP01.Sha256
  targetIds: NIP01.Sha256[]
}*/

export class AppNostrDexie extends Dexie {
  // 'nostr_events' is added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  nostr_events!: Table<NostrEvent>
  //nostr_event_refs!: Table<NostrEventRef>

  constructor() {
    super('app_nostr');
    this.version(1).stores({
      nostr_events: '&id, pubkey, created_at', // Primary key and indexed props
      //nostr_event_refs: '&sourceId, *targetIds' // unique primary key and array of keys (Multi-valued)
    })
  }
}

export const db = new AppNostrDexie()
