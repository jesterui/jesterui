import * as NIP01 from './nostr/nip01'
import { GameStartEvent } from './app_db'
import { JesterId, JESTER_ID_PREFIX } from './jester'

export const shortenString = (value: string, chars = 8, separator = '...') => {
  const prefixLength = Math.max(Math.floor(chars / 2), 1)
  if (value.length <= prefixLength * 2) {
    return `${value}`
  }
  return `${value.substring(0, prefixLength)}${separator}${value.substring(value.length - prefixLength)}`
}

export const displayKey = (pubkey: NIP01.PubKey, chars = 8, separator = '...') => {
  return shortenString(pubkey, chars, separator)
}

export const displayGameNameShort = (gameId: NIP01.EventId, length = 5) => gameId.substring(0, length)
export const displayGameName = (gameEvent: GameStartEvent, length = 8) => gameEvent.id.substring(0, length)
export const displayJesterIdShort = (jesterId: JesterId, length = 12) => {
  return (
    jesterId.substring(0, JESTER_ID_PREFIX.length) + shortenString(jesterId.substring(JESTER_ID_PREFIX.length), length)
  )
}
export const pubKeyDisplayName = (pubKey: NIP01.PubKey, length = 8) => pubKey.substring(0, length)

export const randomNumberBetween = (min: number, max: number) => min + Math.round(Math.random() * (max - min))
