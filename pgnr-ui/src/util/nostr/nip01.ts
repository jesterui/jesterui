export type Hex = string
export type PubKey = Hex
export type Sig = Hex //  <64-bytes signature of the sha256 hash of the serialized event data, which is the same as the "id" field>

export type Sha256 = Hex

type EventId = Hex

type Timestamp = number
type CreatedAtTimestamp = Timestamp

type TagType = 'e' | 'p' | string

// EVENT Types
// 0: set_metadata: the content is set to a stringified JSON object {name: <string>, about: <string>, picture: <url, string>} describing the user who created the event. A relay may delete past set_metadata events once it gets a new one for the same pubkey.
type EventSetMetadata = 0
// 1: text_note: the content is set to the text content of a note (anything the user wants to say).
type EventTextNote = 1
// 2: recommend_server: the content
type EventRecommendServer = 2

type OtherEventType = number

type Kind = EventSetMetadata | EventTextNote | EventRecommendServer | OtherEventType

// The <recommended relay URL> item present on the "e" and "p" tags is an
// optional (could be set to "") URL of a relay the client could attempt
// to connect to fetch the tagged event or other events from a tagged
// profile. It MAY be ignored, but it exists to increase censorship
// resistance and make the spread of relay addresses more seamless across
// clients.
type RelayUrl = `wss://${string}` | `ws://${string}.onion`
const __example_RelayUrl1: RecommendedRelayUrl = `wss://example.com`
const __example_RelayUrl2: RecommendedRelayUrl = `ws://example.onion`
const __example_RelayUrl3: RecommendedRelayUrl = `wss://example.onion`

type RecommendedRelayUrl = RelayUrl | ''
const __example_RecommendedRelayUrl: RecommendedRelayUrl = ''
const __example_RecommendedRelayUrl1: RecommendedRelayUrl = `wss://example.com`
const __example_RecommendedRelayUrl2: RecommendedRelayUrl = `ws://example.onion`
const __example_RecommendedRelayUrl3: RecommendedRelayUrl = `wss://example.onion`
// type error: const __example_RecommendedRelayUrl4: RecommendedRelayUrl = `ws://example.com`

type Other = any

type TagRef = EventId | PubKey | Other
type Tag = [TagType, TagRef, RecommendedRelayUrl?]
type Tags = Tag[]

type Content = string // <arbitrary string>

/*
{
    "id": <32-bytes sha256 of the the serialized event data>
    "pubkey": <32-bytes hex-encoded public key of the event creator>,
    "created_at": <unix timestamp in seconds>,
    "kind": <integer>,
    "tags": [
      ["e", <32-bytes hex of the id of another event>, <recommended relay URL>],
      ["p", <32-bytes hex of the key>, <recommended relay URL>],
      ... // other kinds of tags may be included later
    ]
    "content": <arbitrary string>,
    "sig": <64-bytes signature of the sha256 hash of the serialized event data, which is the same as the "id" field>,
  }
*/
export interface EventInConstruction {
  pubkey?: PubKey
  created_at?: CreatedAtTimestamp
  kind?: Kind
  tags?: Tags
  content?: Content
}
const __exampleEventInConstruction1: EventInConstruction = {}
const __exampleEventInConstruction2: EventInConstruction = {
  pubkey: '',
  created_at: 0,
  kind: 0,
  tags: [],
  content: '',
}

export interface EventParts {
  pubkey: PubKey
  created_at: CreatedAtTimestamp
  kind: Kind
  tags: Tags
  content: Content
}

export type UnsignedEvent = EventParts & {
  id: Sha256 // 32-bytes sha256
}

const __exampleUnsignedEvent1: UnsignedEvent = {
  id: '',
  pubkey: '',
  created_at: 0,
  kind: 0,
  tags: [],
  content: '',
}

export type Event = UnsignedEvent & {
  sig: Sig
}

const __exampleEvent1: Event = {
  id: '',
  pubkey: '',
  created_at: 0,
  kind: 0,
  tags: [],
  content: '',
  sig: '',
}

/*[
    0,
    <pubkey, as a (lowercase) hex string>,
    <created_at, as a number>,
    <kind, as a number>,
    <tags, as an array of arrays of strings>,
    <content, as a string>
  ]*/
export type SignableEventData = [0, PubKey, CreatedAtTimestamp, Kind, Tags, Content]

type ListOfPubKeys = PubKey[]

/*
{
  "ids": <a list of event ids or prefixes>,
  "kinds": <a list of a kind numbers>,
  "#e": <a list of event ids that are referenced in an "e" tag>,
  "#p": <a list of pubkeys that are referenced in a "p" tag>,
  "since": <a timestamp, events must be newer than this to pass>,
  "until": <a timestamp, events must be older than this to pass>,
  "authors": <a list of pubkeys or prefixes, the pubkey of an event must be one of these>
}
*/
type EventIdOrPrefix = EventId | string
type ListOfEventIdsOrPrefixes = EventIdOrPrefix[] // <a list of event ids or prefixes>

type Kinds = Kind[] // <a list of a kind numbers>

type KindAsTag<T extends Kind> = `#${T}`
type KindId = `#${TagType}`

type EId = `#e`
type EIdValues = ListOfEventIdsOrPrefixes
type PId = `#p`
type PIdValues = ListOfPubKeys

type PubKeyOrPrefix = PubKey | string
type ListOfPublicKeysOrPrefix = PubKeyOrPrefix[]

type KindIdValue = EIdValues | PIdValues | Other

export interface Filter {
  ids?: ListOfEventIdsOrPrefixes
  kinds?: Kinds
  '#e'?: EIdValues
  '#p'?: PIdValues
  [kindId: KindId]: KindIdValue
  since?: Timestamp
  until?: Timestamp
  authors?: ListOfPublicKeysOrPrefix
}
const __exampleFilter1: Filter = {}
const __exampleFilter2: Filter = {
  ids: [],
  kinds: [],
  '#e': [],
  '#p': [],
  since: 0,
  until: 1,
  authors: [],
}

export type SubscriptionId = string

// CLIENT TO RELAY

//["EVENT", <event JSON as defined above>], used to publish events.
//["REQ", <subscription_id>, <filters JSON>...], used to request events and subscribe to new updates.
//["CLOSE", <subscription_id>], used to stop previous subscriptions.

export enum ClientEventType {
  EVENT = 'EVENT',
  REQ = 'REQ',
  CLOSE = 'CLOSE',
}

export type ClientReqMessage = [ClientEventType.REQ, SubscriptionId, ...Filter[]]
export const createClientReqMessage = (sub: SubscriptionId, filters: Filter[]): ClientReqMessage => {
  return [ClientEventType.REQ, sub, ...filters]
}

export type ClientEventMessage = [ClientEventType.EVENT, Event]
export const createClientEventMessage = (event: Event): ClientEventMessage => {
  return [ClientEventType.EVENT, event]
}
export type ClientCloseMessage = [ClientEventType.CLOSE, SubscriptionId]
export const createClientCloseMessage = (sub: SubscriptionId): ClientCloseMessage => {
  return [ClientEventType.CLOSE, sub]
}

export type ClientMessage = ClientReqMessage | ClientEventMessage | ClientCloseMessage

// RELAY TO CLIENT
// ["EVENT", <subscription_id>, <event JSON as defined above>], used to send events requested by clients.
// ["NOTICE", <message>], used to send human-readable error messages or other things to clients.

export enum RelayEventType {
  EVENT = 'EVENT',
  NOTICE = 'NOTICE',
}

export type RelayEventMessage = [RelayEventType.EVENT, SubscriptionId, Event]
export type RelayNoticeMessage = [RelayEventType.NOTICE, string]

export type RelayMessage = RelayEventMessage | RelayNoticeMessage
