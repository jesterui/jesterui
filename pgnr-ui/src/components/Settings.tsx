import React from 'react'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useWebsocket, send as websocketSend, readyStatePhrase } from '../context/WebsocketContext'
import * as Nostr from '../util/nostr/identity'
import { ActivityIndicator } from '../components/ActivityIndicator'
import { WebsocketIndicator } from '../components/WebsocketIndicator'

import { getSession, setSessionAttribute } from '../util/session'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Checkbox from '@material-tailwind/react/Checkbox'
// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Heading2 from '@material-tailwind/react/Heading2'

/*import {
  // generatePrivateKey,
  relayConnect,
  relayPool,
  signEvent,
  validateEvent,
  verifySignature,
  serializeEvent,
  getEventHash,
  // getPublicKey,
  getBlankEvent,
  matchFilter,
  matchFilters,
  // @ts-ignore
} from 'nostr-tools'*/

const defaultRelays = [
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
  'ws://localhost:7000',
]

export default function Settings() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const websocket = useWebsocket()

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const onRelayClicked = (relay: string) => {
    const index = settings.relays.indexOf(relay, 0)
    const shouldAdd = index === -1
    if (shouldAdd) {
      // TODO: For multiple release do: settingsDispatch({ ...settings, relays: [relay, ...settings.relays] })
      settingsDispatch({ ...settings, relays: [relay] })
    } else {
      const newVal = [...settings.relays]
      newVal.splice(index, 1)
      settingsDispatch({ ...settings, relays: newVal })
    }
  }

  const newIdentity = () => {
    const privateKey = Nostr.generatePrivateKey()
    const publicKey = Nostr.publicKey(privateKey)

    setSessionAttribute({ privateKey })

    const filterForOwnEvents: NIP01.Filter = {
      authors: [publicKey],
    }

    settingsDispatch({
      ...settings,
      identity: { ...settings.identity, pubkey: publicKey },
      subscriptions: [
        {
          id: 'my-sub',
          filters: [filterForOwnEvents, AppUtils.PGNRUI_START_GAME_FILTER],
        },
      ],
    })
  }

  const sendHelloWorld = async () => {
    if (!websocket) {
      console.info('Websocket not available..')
      return
    }
    if (!publicKeyOrNull) {
      console.info('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      console.info('PrivKey not available..')
      return
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const eventParts = NostrEvents.blankEvent()
    eventParts.kind = 1 // text_note
    eventParts.pubkey = publicKey
    eventParts.created_at = Math.floor(Date.now() / 1000)
    eventParts.content = 'Hello World'
    const event = NostrEvents.constructEvent(eventParts)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    const req = NIP01.createClientEventMessage(signedEvent)

    const abortCtrl = new AbortController()
    console.debug('[Nostr] -> ', req)
    websocketSend(websocket, req, { signal: abortCtrl.signal })
  }

  return (
    <div className="screen-settings">
      <Heading1 color="blueGray">Settings</Heading1>

      <Heading2 color="blueGray">Identity</Heading2>
      <div>
        <div className="py-1">
          Public Key: <span className="font-mono">{settings.identity?.pubkey}</span>
        </div>
        <div className="py-1">
          Private Key: <span className="font-mono">{privateKeyOrNull}</span>
        </div>

        <div className="py-1">
          <button type="button" className="bg-white bg-opacity-20 rounded px-2 py-1" onClick={newIdentity}>
            New
          </button>
        </div>

        <div className="py-1">
          <button type="button" className="bg-white bg-opacity-20 rounded px-2 py-1" onClick={sendHelloWorld}>
            Send 'Hello World'
          </button>
        </div>
      </div>

      <Heading2 color="blueGray">Subscriptions</Heading2>
      <div>
        <pre>{`${JSON.stringify(settings.subscriptions, null, 2)}`}</pre>
      </div>

      <Heading2 color="blueGray">Relays</Heading2>
      <div>
        Status:
        <span className="px-1">
          <WebsocketIndicator />
        </span>
        <span className="font-mono">{readyStatePhrase(websocket?.readyState)}</span>
      </div>
      <div>
        Host:
        <span className="px-1">
          <span className="font-mono">{websocket?.url}</span>
        </span>
      </div>
      <div className="py-2">
        {defaultRelays.map((relay, index) => (
          <div key={index}>
            <Checkbox
              color="blueGray"
              text={
                <div>
                  <ActivityIndicator
                    isOn={!!(websocket?.url.startsWith(relay) && websocket?.readyState === WebSocket.OPEN)}
                  />{' '}
                  {relay}
                </div>
              }
              id={relay}
              checked={settings.relays.includes(relay)}
              onChange={() => onRelayClicked(relay)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
