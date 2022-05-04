import React, { useEffect, useState, useCallback, ChangeEvent } from 'react'
import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'
import * as Nostr from '../util/nostr/identity'
import { WebsocketIndicator } from '../components/WebsocketIndicator'
import { SelectedBot, BotSelector } from '../components/BotSelector'
import { useWebsocket, readyStatePhrase } from '../context/WebsocketContext'
import { useOutgoingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import { useUpdateSubscription } from '../context/NostrSubscriptionsContext'
import { bytesToHex, randomBytes } from '@noble/hashes/utils'

import { getSession, setSessionAttribute } from '../util/session'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as Bot from '../util/bot'

// @ts-ignore
import Checkbox from '@material-tailwind/react/Checkbox'
// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Heading2 from '@material-tailwind/react/Heading2'
// @ts-ignore
import Input from '@material-tailwind/react/Input'

export const TEST_MESSAGE_REF = bytesToHex(randomBytes(32))

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

type PubKey = string | null
type PrivKey = string | null

function TestNostrConnectionButton() {
  const settings = useSettings()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const outgoingNostr = useOutgoingNostrEvents()
  const updateSubscription = useUpdateSubscription()

  const [waitForEvent, setWaitForEvent] = useState<NIP01.Event | null>(null)
  const [statusText, setStatusText] = useState<string>('')

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  useEffect(() => {
    const since = Math.round(Date.now() / 1_000)

    const filterForOwnTestEvents: NIP01.Filter[] =
      publicKeyOrNull !== null
        ? [
            {
              authors: [publicKeyOrNull],
              since: since,
              '#e': [TEST_MESSAGE_REF],
            },
          ]
        : []

    updateSubscription({
      id: 'dev_debug',
      filters: filterForOwnTestEvents,
    })

    return () => {
      updateSubscription({
        id: 'dev_debug',
        filters: [],
      })
    }
  }, [publicKeyOrNull, updateSubscription])

  useEffect(() => {
    if (statusText === '') return

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
  }, [statusText])

  useEffect(() => {
    if (!waitForEvent) return

    const state = incomingNostrBuffer.state()

    const eventFound = state.events[waitForEvent.id]
    setStatusText(eventFound ? '200 OK' : '404 NOT FOUND')

    if (eventFound) {
      setWaitForEvent(null)
    }
  }, [waitForEvent, incomingNostrBuffer])

  const onButtonClicked = async () => {
    if (!outgoingNostr) {
      window.alert('Nostr EventBus not ready..')
      return
    }
    if (!publicKeyOrNull) {
      window.alert('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      window.alert('PrivKey not available..')
      return
    }

    try {
      const publicKey = publicKeyOrNull!
      const privateKey = privateKeyOrNull!

      const eventParts = NostrEvents.blankEvent()
      eventParts.kind = 1 // text_note
      eventParts.pubkey = publicKey
      eventParts.tags = [['e', TEST_MESSAGE_REF]]
      eventParts.created_at = Math.floor(Date.now() / 1000)
      eventParts.content = 'Hello World'
      const event = NostrEvents.constructEvent(eventParts)
      const signedEvent = await NostrEvents.signEvent(event, privateKey)

      const isSignatureValid = await NostrEvents.verifySignature(signedEvent)
      if (!isSignatureValid) {
        throw new Error('Cannot create valid signature for Nostr event..')
      }

      setWaitForEvent(signedEvent)

      outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
    } catch (e) {
      const message = (e instanceof Error && e.message) || e
      window.alert(`Error: ${message}`)
    }
  }

  return (
    <button type="button" className="bg-white bg-opacity-20 rounded px-2 py-1" onClick={() => onButtonClicked()}>
      {waitForEvent ? 'Testing connection...' : `Test connection ${statusText}`}
    </button>
  )
}

const validateKeyPair = async (pubKey: PubKey, privKey: PrivKey): Promise<boolean> => {
  if (pubKey === null || privKey === null) return false

  try {
    const eventParts = NostrEvents.blankEvent()
    eventParts.kind = 1 // text_note
    eventParts.pubkey = pubKey
    eventParts.created_at = Math.floor(Date.now() / 1000)
    eventParts.content = 'Hello World'
    const event = NostrEvents.constructEvent(eventParts)
    const signedEvent = await NostrEvents.signEvent(event, privKey)

    const isSignatureValid = await NostrEvents.verifySignature(signedEvent)
    return isSignatureValid
  } catch (e) {
    return false
  }
}

/*const useForceRerender = () => {
  const [tick, setTick] = useState(0)
  const update = useCallback(() => {
    setTick(tick + 1)
  }, [tick])
  return update
}*/

const KeyPairForm = () => {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const [publicKeyInputValue, setPublicKeyInputValue] = useState<PubKey>(publicKeyOrNull)
  const [privateKeyInputValue, setPrivateKeyInputValue] = useState<PrivKey>(privateKeyOrNull)
  const [keyPairValid, setKeyPairValid] = useState<boolean | undefined>(undefined)

  const updatePrivKey = (privKey: PrivKey) => {
    setSessionAttribute({ privateKey: privKey })
    // forceRerender()
  }

  const updatePubKey = useCallback(
    (pubKey: PubKey) => {
      if (pubKey === null) {
        settingsDispatch({ identity: undefined } as AppSettings)
      } else {
        settingsDispatch({ identity: { pubkey: pubKey } } as AppSettings)
      }
    },
    [settingsDispatch]
  )

  useEffect(() => {
    setPublicKeyInputValue(publicKeyOrNull || '')
  }, [publicKeyOrNull])

  useEffect(() => {
    setPrivateKeyInputValue(privateKeyOrNull || '')
  }, [privateKeyOrNull])

  useEffect(() => {
    setKeyPairValid(undefined)
  }, [publicKeyInputValue, privateKeyInputValue])

  useEffect(() => {
    if (keyPairValid) return

    const abortCtrl = new AbortController()

    validateKeyPair(publicKeyInputValue, privateKeyInputValue).then((success) => {
      if (abortCtrl.signal.aborted) return

      setKeyPairValid(success)
      if (success) {
        updatePrivKey(privateKeyInputValue)
        updatePubKey(publicKeyInputValue)
      }
    })

    return () => abortCtrl.abort()
  }, [keyPairValid, publicKeyInputValue, privateKeyInputValue, updatePubKey])

  const newIdentityButtonClicked = () => {
    const privateKey = Nostr.generatePrivateKey()
    const publicKey = Nostr.publicKey(privateKey)

    updatePrivKey(privateKey)
    updatePubKey(publicKey)
  }

  const deleteIdentityButtonClicked = () => {
    updatePrivKey(null)
    updatePubKey(null)
  }

  return (
    <>
      <div className="pb-4">
        <div className="pb-2">
          Public Key: <span className="font-mono">{publicKeyOrNull}</span>
          <Input
            type="text"
            size="regular"
            outline={true}
            value={publicKeyInputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPublicKeyInputValue(e.target.value)}
            placeholder="Public Key"
          />
        </div>
        <div className="pb-2">
          Private Key: <span className="font-mono">{privateKeyOrNull}</span>
          <Input
            type="text"
            size="regular"
            outline={true}
            value={privateKeyInputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPrivateKeyInputValue(e.target.value)}
            placeholder="Private Key"
            error={keyPairValid === false ? ' ' : undefined}
            success={keyPairValid === true ? ' ' : undefined}
          />
        </div>
      </div>
      <div className="py-1">
        <button type="button" className="bg-white bg-opacity-20 rounded px-2 py-1" onClick={newIdentityButtonClicked}>
          New
        </button>
        <button
          type="button"
          className="bg-white bg-opacity-20 rounded px-2 py-1 mx-1"
          onClick={deleteIdentityButtonClicked}
        >
          Forget
        </button>
      </div>
    </>
  )
}

export default function Settings() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const websocket = useWebsocket()

  useEffect(() => {
    const previousTitle = document.title
    document.title = `jester - Settings`

    return () => {
      document.title = previousTitle
    }
  }, [])

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
    settingsDispatch({ botName: bot?.name || null } as AppSettings)
  }

  const onRelayClicked = (relay: string) => {
    const index = settings.relays.indexOf(relay, 0)
    const shouldAdd = index === -1
    if (shouldAdd) {
      settingsDispatch({ relays: [relay] } as AppSettings)
    } else {
      const newVal = [...settings.relays]
      newVal.splice(index, 1)
      settingsDispatch({ relays: newVal } as AppSettings)
    }
  }

  return (
    <div className="screen-settings pb-4">
      <Heading1 color="blueGray">Settings</Heading1>

      <Heading2 color="blueGray">Identity</Heading2>
      <div>
        <KeyPairForm />
      </div>
      <div className="py-1">
        <TestNostrConnectionButton />
      </div>

      <BotSelector
        playerName="Your Bot"
        availableBots={Bot.Bots}
        selectedBot={selectedBot}
        setSelectedBot={updateSelectedBot}
        disabled={false}
      />

      {/*
      <Heading2 color="blueGray">Subscriptions</Heading2>
      <div>
        <pre>{`${JSON.stringify(settings.subscriptions, null, 2)}`}</pre>
      </div>
  */}
      <Heading2 color="blueGray">Relays</Heading2>
      <div className="pb-4">
        <div className="pb-1">
          Status:
          <span className="px-1">
            <WebsocketIndicator />
          </span>
          <span className="font-mono">{readyStatePhrase(websocket?.readyState)}</span>
        </div>
        <div className="pb-1">
          Host:
          <span className="px-1">
            <span className="font-mono">{websocket?.url}</span>
          </span>
        </div>
        <div className="py-1">
          <TestNostrConnectionButton />
        </div>
        <div className="py-1">
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
    </div>
  )
}
