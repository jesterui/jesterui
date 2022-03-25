import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex as toHex } from '@noble/hashes/utils'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { arrayEquals } from './utils'

export const FEN_START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
export const PGNRUI_START_GAME_E_REF = toHex(sha256(FEN_START_POSITION))

export const PGNRUI_START_GAME_FILTER: NIP01.Filter = {
  '#e': [PGNRUI_START_GAME_E_REF],
}

const START_GAME_EVENT_PARTS: NIP01.EventInConstruction = (() => {
  const eventParts = NostrEvents.blankEvent()
  eventParts.kind = 1 // text_note
  eventParts.content = ''
  eventParts.tags = [['e', PGNRUI_START_GAME_E_REF]]
  return eventParts
})()

export const constructStartGameEvent = (pubkey: NIP01.PubKey): NIP01.UnsignedEvent => {
  const eventParts = {
    ...START_GAME_EVENT_PARTS,
    created_at: Math.floor(Date.now() / 1000),
    pubkey,
  } as NIP01.EventParts
  return NostrEvents.constructEvent(eventParts)
}

export const isStartGameEvent = (event?: NIP01.Event): boolean => {
  return (
    !!event && event.content === '' && event.kind === 1 && arrayEquals(event.tags, [['e', PGNRUI_START_GAME_E_REF]])
  )
}

export const gameDisplayNameShort = (gameId: NIP01.Sha256, length = 5) => gameId.substring(0, length)
export const gameDisplayName = (gameId: NIP01.Sha256, length = 8) => gameId.substring(0, length)
