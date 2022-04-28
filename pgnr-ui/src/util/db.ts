
import Dexie, { Table } from 'dexie';
import * as NIP01 from './nostr/nip01'

export interface NostrEvent extends NIP01.Event {
}

export class AppNostrDexie extends Dexie {
  // 'nostr_events' is added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  nostr_events!: Table<NostrEvent>; 

  constructor() {
    super('app_nostr');
    this.version(1).stores({
      nostr_events: '&id, pubkey, created_at' // Primary key and indexed props
    });
  }
}

export const db = new AppNostrDexie();