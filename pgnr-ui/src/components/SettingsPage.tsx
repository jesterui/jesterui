import React, { useEffect, useState, useCallback, useMemo, useRef, ChangeEvent } from 'react'
import { bytesToHex, randomBytes } from '@noble/hashes/utils'

import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useWebsocket, readyStatePhrase } from '../context/WebsocketContext'
import { useOutgoingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import { useUpdateSubscription } from '../context/NostrSubscriptionsContext'

import { WebsocketIndicator } from '../components/WebsocketIndicator'
import { GenerateRandomIdentityButton } from '../components/IdentityButtons'
import { BotSelector } from '../components/BotSelector'

import { getSession, setSessionAttribute } from '../util/session'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as Bot from '../util/bot'
import { DEFAULT_RELAYS } from '../util/app_nostr'
import { displayKey } from '../util/app'

// @ts-ignore
import Checkbox from '@material-tailwind/react/Checkbox'
// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Heading2 from '@material-tailwind/react/Heading2'
// @ts-ignore
import Heading3 from '@material-tailwind/react/Heading3'
// @ts-ignore
import Input from '@material-tailwind/react/Input'

export const TEST_MESSAGE_REF = bytesToHex(randomBytes(32))
export const TEST_MESSAGE_KIND: NIP01.Kind = 7357 // "test"

type PubKey = string | null
type PrivKey = string | null

function TestNostrConnectionButton() {
  const settings = useSettings()
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const outgoingNostr = useOutgoingNostrEvents()
  const updateSubscription = useUpdateSubscription()

  const [waitForEvent, setWaitForEvent] = useState<NIP01.Event | null>(null)
  const [statusText, setStatusText] = useState<string>('')

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
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
              kinds: [TEST_MESSAGE_KIND],
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
    }, 2_000)

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
    if (statusText !== '') return

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
      eventParts.kind = TEST_MESSAGE_KIND
      eventParts.pubkey = publicKey
      eventParts.tags = [['e', TEST_MESSAGE_REF]]
      eventParts.created_at = Math.floor(Date.now() / 1000)
      eventParts.content = ''
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
    <button
      type="button"
      className="bg-white bg-opacity-20 rounded px-2 py-1"
      onClick={() => onButtonClicked()}
      disabled={statusText !== ''}
    >
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
  const generateRandomIdentityButtonRef = useRef<HTMLButtonElement>(null)

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  const [publicKeyInputValue, setPublicKeyInputValue] = useState<PubKey>(publicKeyOrNull || '')
  const [privateKeyInputValue, setPrivateKeyInputValue] = useState<PrivKey>(privateKeyOrNull || '')
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

  const deleteIdentityButtonClicked = () => {
    updatePrivKey(null)
    updatePubKey(null)
  }

  return (
    <>
      <div className="pb-4">
        <div className="pb-2">
          Public Key: <span className="font-mono">{publicKeyOrNull && displayKey(publicKeyOrNull)}</span>
          <Input
            type="text"
            size="regular"
            outline={true}
            value={publicKeyInputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPublicKeyInputValue(e.target.value)}
            placeholder="Public Key"
            style={{ color: 'currentColor' }}
          />
        </div>
        <div className="pb-2">
          Private Key: <span className="font-mono">{privateKeyOrNull && displayKey(privateKeyOrNull)}</span>
          <Input
            type="text"
            size="regular"
            outline={true}
            value={privateKeyInputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPrivateKeyInputValue(e.target.value)}
            placeholder="Private Key"
            style={{ color: 'currentColor' }}
            error={keyPairValid === false ? ' ' : undefined}
            success={keyPairValid === true ? ' ' : undefined}
          />
        </div>
      </div>
      <div className="py-1 flex">
        <>
          <Button
            color="deepOrange"
            buttonType={privateKeyOrNull === null ? 'filled' : 'outline'}
            size="regular"
            rounded={false}
            block={false}
            iconOnly={false}
            ripple="light"
            ref={generateRandomIdentityButtonRef}
            className="w-40"
          >
            New Identity
            <GenerateRandomIdentityButton buttonRef={generateRandomIdentityButtonRef} />
          </Button>
        </>

        <Button
          color="blueGray"
          buttonType={privateKeyOrNull !== null ? 'filled' : 'outline'}
          size="regular"
          rounded={false}
          block={false}
          iconOnly={false}
          ripple="light"
          onClick={deleteIdentityButtonClicked}
          disabled={privateKeyOrNull === null}
          className="w-40 mx-1"
        >
          Forget
        </Button>
      </div>
    </>
  )
}

export default function SettingsPage() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const websocket = useWebsocket()

  useEffect(() => {
    const previousTitle = document.title
    document.title = `Settings`

    return () => {
      document.title = previousTitle
    }
  }, [])

  const relays = useMemo(() => settings.relays, [settings])
  const selectedBotName = useMemo(() => settings.botName, [settings])

  const updateSelectedBotName = (botName: string | null) => {
    settingsDispatch({ botName } as AppSettings)
  }

  const onRelayClicked = useCallback(
    (relay: string) => {
      const index = relays.indexOf(relay, 0)
      const shouldAdd = index === -1
      if (shouldAdd) {
        settingsDispatch({ relays: [relay] } as AppSettings)
      } else {
        const newVal = [...relays]
        newVal.splice(index, 1)
        settingsDispatch({ relays: newVal } as AppSettings)
      }
    },
    [relays, settingsDispatch]
  )

  const onDeveloperModeToggleClicked = () => {
    settingsDispatch({ dev: !settings.dev } as AppSettings)
  }

  const checkboxColor = (readyState: number | undefined) => {
    switch (readyState) {
      case WebSocket.CONNECTING:
        return 'yellow'
      case WebSocket.OPEN:
        return 'green'
      case WebSocket.CLOSING:
        return 'deepOrange'
      case WebSocket.CLOSED:
        return 'red'
      default:
        return 'gray'
    }
  }

  return (
    <div className="screen-settings pb-4">
      <Heading1 color="blueGray">Settings</Heading1>

      <div className="pb-4">
        <Heading2 color="blueGray">jester</Heading2>
        <Checkbox
          color="blueGray"
          text="Developer Mode"
          id="developer-mode-checkbox"
          checked={settings.dev}
          onChange={() => onDeveloperModeToggleClicked()}
        />

        {settings.dev && (
          <>
            <div style={{ display: process.env.NODE_ENV === 'development' ? 'block' : 'none' }}>
              <BotSelector
                label="Companion selection"
                availableBots={Bot.Bots}
                selectedBotName={selectedBotName}
                setSelectedBotName={updateSelectedBotName}
                disabled={false}
              />
            </div>
          </>
        )}
      </div>

      <Heading2 color="blueGray">nostr</Heading2>
      <div className="grid gap-x-24 gap-y-4 grid-cols-1 lg:grid-cols-2">
        <div className="flex-1">
          <Heading3 color="blueGray">Identity</Heading3>
          <div>
            <KeyPairForm />
          </div>
        </div>
        <div className="flex-1">
          <Heading3 color="blueGray">Relays</Heading3>
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
            {settings.dev && (
              <>
                <div className="py-1">
                  <TestNostrConnectionButton />
                </div>
              </>
            )}
            <div className="py-1">
              {DEFAULT_RELAYS.map((relay, index) => (
                <div key={index} className="mb-1">
                  <Checkbox
                    color={checkboxColor(websocket?.readyState)}
                    text={relay}
                    id={`relay-checkbox-${index}`}
                    checked={relays.includes(relay)}
                    onChange={() => onRelayClicked(relay)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-4">
        {settings.dev && (
          <>
            <Heading2 color="blueGray">Raw</Heading2>
            <div>
              <pre>{`${JSON.stringify(settings, null, 2)}`}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
