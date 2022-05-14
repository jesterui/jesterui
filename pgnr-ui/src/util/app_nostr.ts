const developmentRelays = [
  'ws://localhost:7000',
  'wss://non-existing-nostr-relay.example.com:7000'
]

const publicRelays = [
  'wss://nostr-pub.wellorder.net',
  'wss://relayer.fiatjaf.com',
  'wss://nostr.rocks',
  'wss://rsslay.fiatjaf.com',
  'wss://freedom-relay.herokuapp.com/ws',
  'wss://nostr-relay.freeberty.net',
  'wss://nostr.bitcoiner.social',
  'wss://nostr-relay.wlvs.space',
  'wss://nostr.onsats.org',
  'wss://nostr-relay.untethr.me',
  'wss://nostr-verified.wellorder.net',
  'wss://nostr.drss.io',
  'wss://nostr.unknown.place',
]

export const DEFAULT_RELAYS = [...(process.env.NODE_ENV === 'development' ? developmentRelays : []), ...publicRelays]
