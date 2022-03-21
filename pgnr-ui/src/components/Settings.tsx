import React, { useEffect, useState } from 'react'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import * as Nostr from '../util/nostr/identity'

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
]

export default function Settings() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()

  const onRelayClicked = (relay: string) => {
    const index = settings.relays.indexOf(relay, 0)
    const shouldAdd = index === -1
    if (shouldAdd) {
      // settingsDispatch({ ...settings, relays: [relay, ...settings.relays] })
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
    settingsDispatch({ ...settings, identity: { ...settings.identity, pubkey: publicKey } })
  }

  return (
    <div className="screen-settings">
      <Heading1 color="blueGray">Settings</Heading1>
      <Heading2 color="blueGray">Identity</Heading2>
      <div>
        <div>
          Public Key: <span className="font-mono">{settings.identity?.pubkey}</span>
        </div>
        <button type="button" className="bg-white bg-opacity-20 rounded px-2 py-1" onClick={newIdentity}>
          New
        </button>
      </div>
      <Heading2 color="blueGray">Relays</Heading2>
      <div>
        {defaultRelays.map((relay, index) => (
          <div key={index}>
            <Checkbox
              color="blueGray"
              text={relay}
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
