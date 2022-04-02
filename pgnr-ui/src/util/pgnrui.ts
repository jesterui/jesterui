import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex as toHex } from '@noble/hashes/utils'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { arrayEquals } from './utils'
import { ValidFen, toValidFen } from '../util/chess'

export const FEN_START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
export const PGNRUI_START_GAME_E_REF = toHex(sha256(FEN_START_POSITION))

export const PGNRUI_START_GAME_FILTER: NIP01.Filter = {
  '#e': [PGNRUI_START_GAME_E_REF],
}

enum Kind {
  Start = 0,
}

type GameStartEvent = NIP01.Event
type MoveEvent = NIP01.Event

export interface PgnruiMove {
  source(): GameStartEvent
  event(): MoveEvent
  parent(): PgnruiMove | null
  children(): PgnruiMove[]
  addChild(child: PgnruiMove): boolean
  fen(): ValidFen
  isValidSuccessor(fen: ValidFen): boolean
  isStart(): boolean
}

const _validStartFen = toValidFen(FEN_START_POSITION)

abstract class AbstractGameMove implements PgnruiMove {
  private _children: PgnruiMove[] = []

  abstract source(): GameStartEvent
  abstract event(): MoveEvent
  abstract parent(): PgnruiMove | null

  children(): PgnruiMove[] {
    return this._children
  }
  addChild(child: PgnruiMove): boolean {
    if (!this.isValidSuccessor(child.fen())) {
      return false
    }
    this._children = [...this._children, child]
    return true
  }
  abstract fen(): ValidFen
  isValidSuccessor(fen: ValidFen): boolean {
    return this.fen().validMoves().contains(fen)
  }
  isStart(): boolean {
    return this.parent() === null && this.fen().value() === _validStartFen.value()
  }
}

export class GameStart extends AbstractGameMove {
  private _source: GameStartEvent
  constructor(source: GameStartEvent) {
    super()
    if (!isStartGameEvent(source)) {
      throw new Error('GameStartMoveEvent can only be created from a GameStartEvent')
    }
    this._source = source
  }
  source() {
    return this._source
  }
  event() {
    return this._source
  }
  parent(): null {
    return null
  }
  fen(): ValidFen {
    return _validStartFen
  }
}

export class GameMove extends AbstractGameMove {
  private _event: NIP01.Event
  private _parent: PgnruiMove
  private _fen: ValidFen

  constructor(event: NIP01.Event, parent: PgnruiMove) {
    super()
    const fen = toValidFen(event.content)
    if (!parent.isValidSuccessor(fen)) {
      throw new Error('Cannot create from fen that is not a succesor')
    }
    this._parent = parent
    this._event = event
    this._fen = fen
  }
  source() {
    return this._parent.source()
  }
  event(): NIP01.Event {
    return this._event
  }
  parent(): PgnruiMove {
    return this._parent
  }
  fen(): ValidFen {
    return this._fen
  }
}

const START_GAME_EVENT_PARTS: NIP01.EventInConstruction = (() => {
  const eventParts = NostrEvents.blankEvent()
  eventParts.kind = 1 // text_note
  eventParts.tags = [['e', PGNRUI_START_GAME_E_REF]]
  return eventParts
})()

export const constructStartGameEvent = (pubkey: NIP01.PubKey): NIP01.UnsignedEvent => {
  const eventParts = {
    ...START_GAME_EVENT_PARTS,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({
      version: '0',
      kind: Kind.Start
    }),
    pubkey,
  } as NIP01.EventParts
  return NostrEvents.constructEvent(eventParts)
}

export const isStartGameEvent = (event?: NIP01.Event): boolean => {
  const json = (event && event.content && JSON.parse(event.content)) || null
  return (
    !!event && event.kind === 1 && arrayEquals(event.tags, [['e', PGNRUI_START_GAME_E_REF]]) &&
    json && json.kind === Kind.Start
  )
}

export const createGameFilter = (gameStart: GameStart): NIP01.Filter => {
  return {
    '#e': [gameStart.event().id],
  }
}

export const gameDisplayNameShort = (gameId: NIP01.Sha256, length = 5) => gameId.substring(0, length)
export const gameDisplayName = (gameId: NIP01.Sha256, length = 8) => gameId.substring(0, length)
