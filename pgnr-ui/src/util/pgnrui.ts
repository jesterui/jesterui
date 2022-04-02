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

interface PgnProtoContent {
  version: '0'
  fen: string
  move: string
  history: string[]
}

type GameStartEvent = NIP01.Event
type MoveEvent = NIP01.Event

export interface PgnruiMove {
  source(): GameStartEvent
  event(): MoveEvent
  parent(): PgnruiMove | null
  children(): PgnruiMove[]
  addChild(child: PgnruiMove): boolean
  content(): PgnProtoContent
  fen(): ValidFen
  isValidSuccessor(move: PgnruiMove): boolean
  isStart(): boolean
}

const _validStartFen = toValidFen(FEN_START_POSITION)

abstract class AbstractGameMove implements PgnruiMove {
  private _children: PgnruiMove[] = []

  abstract source(): GameStartEvent
  abstract event(): MoveEvent
  abstract parent(): PgnruiMove | null
  abstract content(): PgnProtoContent
  abstract fen(): ValidFen

  children(): PgnruiMove[] {
    return this._children
  }
  addChild(child: PgnruiMove): boolean {
    if (!this.isValidSuccessor(child)) {
      return false
    }
    this._children = [...this._children, child]
    return true
  }
  isValidSuccessor(move: PgnruiMove): boolean {
    return this.fen().validMoves().contains(move.fen())
    // && arrayEquals(this.content.moves)
  }
  isStart(): boolean {
    return this.parent() === null && this.content().fen === _validStartFen.value()
  }
}

export class GameStart extends AbstractGameMove {
  private _event: GameStartEvent
  private _content: PgnProtoContent
  constructor(event: GameStartEvent) {
    super()
    if (!isStartGameEvent(event)) {
      throw new Error('GameStartMoveEvent can only be created from a GameStartEvent')
    }
    this._event = event
    this._content = JSON.parse(event.content) as PgnProtoContent
  }
  source() {
    return this._event
  }
  event() {
    return this._event
  }
  parent(): null {
    return null
  }
  content(): PgnProtoContent {
    return this._content
  }
  fen(): ValidFen {
    // TODO: it is only supported to start from the start fen
    // future version might let you propose to start from any position
    return _validStartFen
  }
}

export class GameMove extends AbstractGameMove {
  private _event: NIP01.Event
  private _parent: PgnruiMove
  private _content: PgnProtoContent
  private _fen: ValidFen

  constructor(event: NIP01.Event, parent: PgnruiMove) {
    super()
    const content = JSON.parse(event.content) as PgnProtoContent
    // TODO: verify that lastMove is valid
    if (!arrayEquals(parent.content().history, content.history.slice(0, content.history.length - 1))) {
      console.error('History does not match its parents... SHOULD THROW ERROR', parent.content().history, content.history)
    }
    if(content.history[content.history.length - 1] !== content.move) {
      console.error('last move does not match history.. SHOULD THROW ERROR', content.history, content.move)
    }
    this._content = content

    this._parent = parent
    this._event = event
    this._fen = toValidFen(content.fen)

    if (!parent.isValidSuccessor(this)) {
      throw new Error('Cannot create from fen that is not a succesor')
    }
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
  content(): PgnProtoContent {
    return this._content
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
      kind: Kind.Start,
      history: [],
    }),
    pubkey,
  } as NIP01.EventParts
  return NostrEvents.constructEvent(eventParts)
}

export const isStartGameEvent = (event?: NIP01.Event): boolean => {
  const json = (event && event.content && JSON.parse(event.content)) || null
  return (
    !!event && event.kind === 1 && arrayEquals(event.tags, [['e', PGNRUI_START_GAME_E_REF]]) &&
    json && json.kind === Kind.Start && 
    arrayEquals(json.history, [])
  )
}

export const createGameFilter = (gameStart: GameStart): NIP01.Filter => {
  return {
    '#e': [gameStart.event().id],
  }
}

export const gameDisplayNameShort = (gameId: NIP01.Sha256, length = 5) => gameId.substring(0, length)
export const gameDisplayName = (gameId: NIP01.Sha256, length = 8) => gameId.substring(0, length)
