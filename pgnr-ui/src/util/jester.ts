import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, randomBytes } from '@noble/hashes/utils'
import * as NIP01 from './nostr/nip01'
import * as NostrEvents from './nostr/events'
import { arrayEquals } from './utils'
import { Pgn, ValidFen, toValidFen, historyToMinimalPgn } from './chess'
import { ChessInstance } from '../components/ChessJsTypes'
import { Buffer } from 'buffer'
import { bech32m, bech32 } from 'bech32'
import { hashWithSha256 } from '../context/JesterBotContext'

export const VALID_JESTER_ID_EXAMPLE = 'jester1ncmkasntavrcj8ujv32a98236kgnx5a3cm9cl9kmqpjh0tgyg46qqsfhdp'

export const FEN_START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
export const JESTER_START_GAME_E_REF = bytesToHex(sha256(FEN_START_POSITION))

export const JESTER_MESSAGE_KIND: NIP01.Kind = 30 // fiatjaf said so.. "please do chess on kind 30"

export const JESTER_START_GAME_FILTER: NIP01.Filter = {
  '#e': [JESTER_START_GAME_E_REF],
  kinds: [JESTER_MESSAGE_KIND],
}

export const createPrivateGameStartFilter = (publicKey: NIP01.PubKey): NIP01.Filter => {
  const publicKeyHashed = hashWithSha256(publicKey)
  const jesterPrivateGameStartRef = hashWithSha256(publicKeyHashed + JESTER_START_GAME_E_REF)
  return {
    '#e': [jesterPrivateGameStartRef],
    kinds: [JESTER_MESSAGE_KIND],
  }
}

export const createGameFilterByGameId = (gameId: NIP01.EventId): NIP01.Filter[] => {
  return [
    {
      ids: [gameId],
      kinds: [JESTER_MESSAGE_KIND],
    },
    {
      '#e': [gameId],
      kinds: [JESTER_MESSAGE_KIND],
    },
  ]
}

export enum KindEnum {
  Start = 0,
  Move = 1,
}

export interface JesterProtoContent {
  version: '0'
  fen: string
  move: string
  history: string[]
}

export const JESTER_ID_PREFIX = 'jester'

export type JesterId = `${typeof JESTER_ID_PREFIX}1${string}`
type GameStartEvent = NIP01.Event
type MoveEvent = NIP01.Event

export interface JesterMove {
  source(): GameStartEvent
  event(): MoveEvent
  parent(): JesterMove | null
  children(): JesterMove[]
  addChild(child: JesterMove): boolean
  content(): JesterProtoContent
  fen(): ValidFen
  pgn(): Pgn
  isValidSuccessor(move: JesterMove): boolean
  isStart(): boolean
}

const _validStartFen = toValidFen(FEN_START_POSITION)

abstract class AbstractGameMove implements JesterMove {
  private _children: JesterMove[] = []

  abstract source(): GameStartEvent
  abstract event(): MoveEvent
  abstract parent(): JesterMove | null
  abstract content(): JesterProtoContent
  abstract fen(): ValidFen

  children(): JesterMove[] {
    return this._children
  }
  addChild(child: JesterMove): boolean {
    if (!this.isValidSuccessor(child)) {
      return false
    }
    this._children = [...this._children, child]
    return true
  }
  isValidSuccessor(move: JesterMove): boolean {
    const fenIsValid = this.fen().validMoves().contains(move.fen())
    return fenIsValid
  }
  isStart(): boolean {
    return this.parent() === null && this.fen() === _validStartFen && this.pgn() === ''
  }
  pgn(): Pgn {
    return historyToMinimalPgn(this.content().history || [])
  }
}

export class GameStart extends AbstractGameMove {
  private _event: GameStartEvent
  private _content: JesterProtoContent
  constructor(event: GameStartEvent) {
    super()
    if (!isStartGameEvent(event)) {
      throw new Error('GameStartMoveEvent can only be created from a GameStartEvent')
    }
    this._event = event
    this._content = JSON.parse(event.content) as JesterProtoContent
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
  content(): JesterProtoContent {
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
  private _parent: JesterMove
  private _content: JesterProtoContent
  private _fen: ValidFen

  constructor(event: NIP01.Event, parent: JesterMove) {
    super()
    const content = JSON.parse(event.content) as JesterProtoContent

    // TODO: verify that 'move' is really valid (can be different to given fen!)
    if (content.history[content.history.length - 1] !== content.move) {
      throw new Error(`Invalid content: 'move' is not last entry of 'history'`)
    }
    if (!arrayEquals(parent.content().history, content.history.slice(0, content.history.length - 1))) {
      throw new Error('History does not match that of parent')
    }

    this._content = content

    this._parent = parent
    this._event = event
    this._fen = toValidFen(content.fen)

    if (!parent.isValidSuccessor(this)) {
      throw new Error('Cannot create from fen that is not a successor')
    }
  }
  source() {
    return this._parent.source()
  }
  event(): NIP01.Event {
    return this._event
  }
  parent(): JesterMove {
    return this._parent
  }
  content(): JesterProtoContent {
    return this._content
  }
  fen(): ValidFen {
    return this._fen
  }
}

const START_GAME_EVENT_PARTS: NIP01.EventInConstruction = (() => {
  const eventParts = NostrEvents.blankEvent()
  eventParts.kind = JESTER_MESSAGE_KIND
  eventParts.tags = [[NIP01.TagEnum.e, JESTER_START_GAME_E_REF]]
  return eventParts
})()

export const constructStartGameEvent = (pubkey: NIP01.PubKey): NIP01.UnsignedEvent => {
  const eventParts = {
    ...START_GAME_EVENT_PARTS,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({
      version: '0',
      kind: KindEnum.Start,
      history: [],
      nonce: bytesToHex(randomBytes(4)),
    }),
    pubkey,
  } as NIP01.EventParts
  return NostrEvents.constructEvent(eventParts)
}

export const constructGameMoveEvent = (
  pubkey: NIP01.PubKey,
  startId: NIP01.EventId,
  headId: NIP01.EventId,
  game: ChessInstance
): NIP01.UnsignedEvent => {
  const history = game.history()
  const latestMove = (history && history[history.length - 1]) || null

  const eventParts = NostrEvents.blankEvent()
  eventParts.kind = JESTER_MESSAGE_KIND
  eventParts.pubkey = pubkey
  eventParts.created_at = Math.floor(Date.now() / 1000)
  eventParts.content = JSON.stringify({
    version: '0',
    kind: KindEnum.Move,
    fen: game.fen(),
    move: latestMove,
    history: history,
  })
  eventParts.tags = [
    [NIP01.TagEnum.e, startId],
    [NIP01.TagEnum.e, headId],
  ]
  return NostrEvents.constructEvent(eventParts)
}

const tryParseJsonObject = (val: string) => {
  try {
    return JSON.parse(val)
  } catch (e) {
    return null
  }
}

export const isStartGameEvent = (event?: NIP01.Event): boolean => {
  const json = (event && event.content && event.content.startsWith('{') && tryParseJsonObject(event.content)) || {}
  return (
    !!event &&
    event.kind === JESTER_MESSAGE_KIND &&
    arrayEquals(event.tags, [[NIP01.TagEnum.e, JESTER_START_GAME_E_REF]]) &&
    json &&
    json.kind === KindEnum.Start &&
    arrayEquals(json.history, [])
  )
}
export const mightBeMoveGameEvent = (event?: NIP01.Event): boolean => {
  const json = (event && event.content && event.content.startsWith('{') && tryParseJsonObject(event.content)) || {}
  return (
    !!event &&
    // must be a text note
    event.kind === JESTER_MESSAGE_KIND &&
    json &&
    json.kind === KindEnum.Move &&
    Array.isArray(json.history) &&
    json.history.length > 0 &&
    // it must refer to at least two other events (start_event, previous_move)
    event.tags.filter((t) => t[0] === NIP01.TagEnum.e).length === 2
  )
}

export const gameIdToJesterId = (gameId: NIP01.EventId): JesterId => {
  const words = bech32m.toWords(Buffer.from(gameId, 'hex'))
  const encoded = bech32m.encode(JESTER_ID_PREFIX, words) as JesterId
  return encoded
}
export const jesterIdToGameId = (jesterId: JesterId): NIP01.EventId => {
  const decoded = bech32m.decode(jesterId)
  if (decoded.prefix !== JESTER_ID_PREFIX) {
    throw new Error('Cannot decode jesterId: invalid prefix')
  }

  const bytes = Buffer.from(bech32.fromWords(decoded.words))
  return bytes.toString('hex')
}

export const tryParseJesterId = (possibleJesterId?: unknown): JesterId | null => {
  if (!possibleJesterId) return null

  const hasValidPrefix = String(possibleJesterId).startsWith(JESTER_ID_PREFIX + '1')
  if (hasValidPrefix === false) return null

  try {
    // @ts-ignore
    const unusedOnPurpose = jesterIdToGameId(possibleJesterId as JesterId)
    return possibleJesterId as JesterId
  } catch (e) {
    console.debug('Could not parse jesterId from given string')
    return null
  }
}
