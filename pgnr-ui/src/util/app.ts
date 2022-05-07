import * as NIP01 from './nostr/nip01'
import { GameStartEvent } from './app_db'

export const displayKey = (pubkey: NIP01.PubKey, chars = 8, separator = '...') => {
  const prefixLength = Math.max(Math.floor(chars / 2), 1)
  if (pubkey.length <= prefixLength * 2) {
    return `${pubkey}`
  }
  return `${pubkey.substring(0, prefixLength)}${separator}${pubkey.substring(pubkey.length - prefixLength)}`
}

export const gameDisplayNameShort = (gameId: NIP01.EventId, length = 5) => gameId.substring(0, length)
export const gameDisplayName = (gameEvent: GameStartEvent, length = 8) => gameEvent.id.substring(0, length)
export const pubKeyDisplayName = (pubKey: NIP01.PubKey, length = 8) => pubKey.substring(0, length)
