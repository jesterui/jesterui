import React, { useEffect, useState } from 'react'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import * as Nostr from '../util/nostr/identity'
import { ActivityIndicator } from '../components/ActivityIndicator'
import { WebsocketIndicator } from '../components/WebsocketIndicator'
import { SelectedBot, BotSelector } from '../components/BotSelector'
import { useWebsocket, readyStatePhrase } from '../context/WebsocketContext'
import { useOutgoingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'

import { getSession, setSessionAttribute } from '../util/session'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as AppUtils from '../util/pgnrui'
import * as Bot from '../util/bot'

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

const developmentRelays = ['ws://localhost:7000']

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

const defaultRelays = [...(process.env.NODE_ENV === 'development' ? developmentRelays : []), ...publicRelays]

function TestNostrConnectionButton() {
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()

  const [waitForEvent, setWaitForEvent] = useState<NIP01.Event | null>(null)
  const [statusText, setStatusText] = useState<string>('')

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  useEffect(() => {
    if (statusText === '') return
    const abortCtrl = new AbortController()
    const timer = setTimeout(() => !abortCtrl.signal.aborted && setStatusText(''), 2000)
    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [statusText])

  useEffect(() => {
    if (!waitForEvent) {
      return
    }

    const state = incomingNostrBuffer.state()

    const isWaiting = !!waitForEvent || false
    if (!isWaiting) return

    const eventFound = state.events[waitForEvent.id]
    setStatusText(eventFound ? '200 OK' : '404 NOT FOUND')

    if (eventFound) {
      setWaitForEvent(null)
      return
    }

    const abortCtrl = new AbortController()
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return

      setWaitForEvent(null)
      setStatusText('')
    }, 2000)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [waitForEvent, incomingNostrBuffer])

  const onButtonClicked = async () => {
    if (!publicKeyOrNull) {
      window.alert('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      window.alert('PrivKey not available..')
      return
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const event = AppUtils.constructStartGameEvent(publicKey)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)

    setWaitForEvent(signedEvent)

    outgoingNostr && outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
  }

  return (
    <button type="button" className="bg-white bg-opacity-20 rounded px-2 py-1" onClick={() => onButtonClicked()}>
      {waitForEvent ? 'Testing connection...' : `Test connection ${statusText}`}
    </button>
  )
}
export default function Settings() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const outgoingNostr = useOutgoingNostrEvents()
  const websocket = useWebsocket()

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const [selectedBot, setSelectedBot] = useState<SelectedBot>(
    (() => {
      if (settings.botName && Bot.Bots[settings.botName]) {
        return {
          name: settings.botName,
          move: Bot.Bots[settings.botName](),
        }
      }

      return null
    })()
  )

  const updateSelectedBot = (bot: SelectedBot) => {
    setSelectedBot(selectedBot)
    settingsDispatch({ ...settings, botName: bot?.name || null })
  }

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

  const newIdentityButtonClicked = () => {
    const privateKey = Nostr.generatePrivateKey()
    const publicKey = Nostr.publicKey(privateKey)

    setSessionAttribute({ privateKey })

    const filterForOwnEvents: NIP01.Filter = {
      authors: [publicKey],
    }

    // TODO: Replace with "updateSubscriptionSettings"
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

  const sendHelloWorldButtonClicked = async () => {
    if (!outgoingNostr) {
      window.alert('Nostr not ready..')
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
    outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
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
          <button type="button" className="bg-white bg-opacity-20 rounded px-2 py-1" onClick={newIdentityButtonClicked}>
            New
          </button>
        </div>

        <div className="py-1">
          <button
            type="button"
            className="bg-white bg-opacity-20 rounded px-2 py-1"
            onClick={sendHelloWorldButtonClicked}
          >
            Send 'Hello World'
          </button>
        </div>
      </div>

      <BotSelector
        playerName="Your Bot"
        availableBots={Bot.Bots}
        selectedBot={selectedBot}
        setSelectedBot={updateSelectedBot}
        disabled={false}
      />

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
      <div className="py-1">
        <TestNostrConnectionButton />
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
