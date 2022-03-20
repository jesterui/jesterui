import React, { useEffect, useState } from 'react'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'

// @ts-ignore
import Checkbox from '@material-tailwind/react/Checkbox'

import {
  generatePrivateKey,
  relayConnect,
  relayPool,
  signEvent,
  validateEvent,
  verifySignature,
  serializeEvent,
  getEventHash,
  getPublicKey,
  getBlankEvent,
  matchFilter,
  matchFilters,
  // @ts-ignore
} from 'nostr-tools'

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
      settingsDispatch({ ...settings, relays: [relay, ...settings.relays] })
    } else {
      const newVal = [...settings.relays]
      newVal.splice(index, 1)
      settingsDispatch({ ...settings, relays: newVal })
    }
  }

  return (
    <div className="screen-settings">
      <h1>Settings2</h1>
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
