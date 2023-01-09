const developmentRelays = ['ws://localhost:7000', 'wss://non-existing-nostr-relay.example.com:7000']

const publicRelays = [
  'wss://nostr-pub.wellorder.net',
  'wss://relay.damus.io',
  'wss://nostr.swiss-enigma.ch',
  'wss://relay.nostr.info',
  'wss://nostr.rocks',
  'wss://nostr-relay.wlvs.space',
  'wss://nostr-relay.untethr.me',
  'wss://nostr-verified.wellorder.net',
  // inactive relays (last checked on 2022-12-20):
  // 'wss://nostr.zebedee.cloud',
  // 'wss://relayer.fiatjaf.com',
  // 'wss://rsslay.fiatjaf.com',
  // 'wss://freedom-relay.herokuapp.com/ws',
  // 'wss://nostr-relay.freeberty.net',
  // 'wss://nostr.bitcoiner.social',
  // 'wss://nostr.onsats.org',
  // 'wss://nostr.drss.io',
  // 'wss://nostr.unknown.place',
]

export const DEFAULT_RELAYS = [...(process.env.NODE_ENV === 'development' ? developmentRelays : []), ...publicRelays]
