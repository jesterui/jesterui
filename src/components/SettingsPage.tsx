import { useEffect, useState, useCallback, useMemo, useRef, ChangeEvent } from 'react'
import { Input, Button, Checkbox, CheckboxProps, Form, Theme, useTheme } from 'react-daisyui'
import { DataTheme } from 'react-daisyui/dist/types'
import { bytesToHex, randomBytes } from '@noble/hashes/utils'

import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useWebsocket, readyStatePhrase } from '../context/WebsocketContext'
import { useOutgoingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
import { useUpdateSubscription } from '../context/NostrSubscriptionsContext'

import { WebsocketIndicator } from '../components/WebsocketIndicator'
import { GenerateRandomIdentityButton } from '../components/IdentityButtons'
import { BotSelector } from '../components/BotSelector'
import { H1, H2, H3 } from '../components/Headings'

import { useSetWindowTitle } from '../hooks/WindowTitle'

import { getSession, setSessionAttribute } from '../util/session'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as Bot from '../util/bot'
import { DEFAULT_RELAYS } from '../util/app_nostr'
import { displayKey } from '../util/app'

const DEFAULT_THEMES = [
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
]

type ThemeItemProps = {
  dataTheme: DataTheme
  selected: boolean
  onClick: (dataTheme: DataTheme) => void
}

function ThemeItem({ dataTheme, selected, onClick }: ThemeItemProps) {
  return (
    <>
      <Theme
        dataTheme={dataTheme}
        role="button"
        aria-label="Theme select"
        aria-pressed={selected}
        tabIndex={0}
        onClick={() => onClick(dataTheme)}
        className="border-base-content/20 hover:border-base-content/40 outline-base-content rounded-lg overflow-hidden border outline-2 outline-offset-2"
      >
        <div className="grid grid-cols-5 grid-rows-3">
          <div className="bg-base-200 col-start-1 row-span-2 row-start-1"></div>
          <div className="bg-base-300 col-start-1 row-start-3"></div>
          <div className="bg-base-100 col-span-4 col-start-2 row-span-3 row-start-1 flex flex-col gap-1 p-2">
            <div className="font-bold">{dataTheme}</div>
            <div className="flex flex-wrap gap-1">
              <Button size="xs" color="primary">
                A
              </Button>
              <Button size="xs" color="secondary">
                A
              </Button>
              <Button size="xs" color="accent">
                A
              </Button>
              <Button size="xs" color="ghost">
                A
              </Button>
            </div>
          </div>
        </div>
      </Theme>
    </>
  )
}

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
    <Button
      onClick={() => onButtonClicked()}
      disabled={waitForEvent !== null}
      color={statusText === '200 OK' ? 'success' : undefined}
    >
      {waitForEvent ? 'Testing connection...' : statusText !== '' ? statusText : 'Test connection'}
    </Button>
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

const KeyPairForm = () => {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const generateRandomIdentityButtonRef = useRef<HTMLButtonElement>(null)

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  const [publicKeyInputValue, setPublicKeyInputValue] = useState<PubKey>(publicKeyOrNull || '')
  const [privateKeyInputValue, setPrivateKeyInputValue] = useState<PrivKey>(privateKeyOrNull || '')
  const [keyPairValid, setKeyPairValid] = useState<boolean | undefined>(undefined)

  const updatePrivKey = (privKey: PrivKey) => setSessionAttribute({ privateKey: privKey })

  const updatePubKey = useCallback(
    (pubkey: PubKey) => {
      settingsDispatch({ identity: pubkey !== null ? { pubkey } : undefined })
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
      <div className="flex flex-col gap-1 mb-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Public Key:</span>
            <span className="label-text-alt font-mono">{publicKeyOrNull && displayKey(publicKeyOrNull)}</span>
          </label>
          <Input
            type="text"
            value={publicKeyInputValue as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPublicKeyInputValue(e.target.value)}
            placeholder="Public Key"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Private Key:</span>
            <span className="label-text-alt font-mono">{privateKeyOrNull && displayKey(privateKeyOrNull)}</span>
          </label>
          <Input
            type="text"
            value={privateKeyInputValue as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPrivateKeyInputValue(e.target.value)}
            placeholder="Private Key"
            color={keyPairValid === false ? 'error' : keyPairValid === true ? 'success' : undefined}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button ref={generateRandomIdentityButtonRef} className="w-40">
          New Identity
          <GenerateRandomIdentityButton buttonRef={generateRandomIdentityButtonRef} />
        </Button>

        <Button onClick={deleteIdentityButtonClicked} className="w-40">
          Forget
        </Button>
      </div>
    </>
  )
}

export default function SettingsPage() {
  useSetWindowTitle({ text: 'Settings' })

  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const websocket = useWebsocket()
  const { theme, setTheme } = useTheme()

  const relays = useMemo(() => settings.relays, [settings])
  const selectedBotName = useMemo(() => settings.botName, [settings])

  const updateSelectedBotName = (botName: string | null) => {
    settingsDispatch({ botName })
  }

  const updateTheme = (val: string) => {
    document.getElementsByTagName('html')[0].setAttribute('data-theme', val)

    settingsDispatch({ theme: val })
    setTheme(val)
  }

  const onRelayClicked = useCallback(
    (relay: string) => {
      const index = relays.indexOf(relay, 0)
      const shouldAdd = index === -1
      if (shouldAdd) {
        settingsDispatch({ relays: [relay] })
      } else {
        const newVal = [...relays]
        newVal.splice(index, 1)
        settingsDispatch({ relays: newVal })
      }
    },
    [relays, settingsDispatch]
  )

  const onDeveloperModeToggleClicked = () => {
    settingsDispatch({ dev: !settings.dev })
  }

  const checkboxColor = (readyState: number | undefined): CheckboxProps['color'] => {
    switch (readyState) {
      case WebSocket.CONNECTING:
        return 'ghost'
      case WebSocket.OPEN:
        return 'success'
      case WebSocket.CLOSING:
        return 'warning'
      case WebSocket.CLOSED:
        return 'error'
      default:
        return undefined
    }
  }

  return (
    <div className="screen-settings pb-4">
      <H1>Settings</H1>

      <div className="pb-16">
        <H2>
          <div className="flex items-center">
            <div>jester</div>
            <img
              className="w-16 h-16 mr-1 ml-1"
              src="logo192.png"
              alt="&#127183;"
              title="&#127183; jester • chess over nostr"
            />
          </div>
        </H2>

        <div className="flex gap-2">
          <div className="flex items-center">
            <Checkbox
              id="developer-mode-checkbox"
              checked={settings.dev}
              onChange={() => onDeveloperModeToggleClicked()}
            />
          </div>
          <div className="flex flex-col p-2">
            <Form.Label htmlFor="developer-mode-checkbox" title="Enable Developer Mode" className="p-0" />
          </div>
        </div>

        {settings.dev && (
          <>
            <div className="pb-4" style={{ display: process.env.NODE_ENV === 'development' ? 'block' : 'none' }}>
              <BotSelector
                label="Personal robot"
                availableBots={Bot.Bots}
                selectedBotName={selectedBotName}
                setSelectedBotName={updateSelectedBotName}
                disabled={false}
              />
            </div>
          </>
        )}
      </div>

      <div className="pb-16">
        <H2>nostr</H2>
        <div className="grid gap-x-24 gap-y-4 grid-cols-1 lg:grid-cols-2">
          <div className="flex-1">
            <H3>Identity</H3>
            <div>
              <KeyPairForm />
            </div>
          </div>
          <div className="flex-1">
            <H3>Relays</H3>
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
                  <div key={index} className="flex gap-2 mb-1">
                    <div className="flex items-center">
                      <Checkbox
                        color={relays.includes(relay) ? checkboxColor(websocket?.readyState) : undefined}
                        id={`relay-checkbox-${index}`}
                        checked={relays.includes(relay)}
                        onChange={() => onRelayClicked(relay)}
                      />
                    </div>
                    <div className="flex flex-col p-2">
                      <Form.Label htmlFor={`relay-checkbox-${index}`} title={relay} className="p-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-16">
        <H2>Theme</H2>

        <div className="flex flex-wrap gap-4">
          <div className="grid grid-cols-4 gap-4">
            {DEFAULT_THEMES.map((t, i) => (
              <ThemeItem
                key={`theme_${t}_#${i}`}
                dataTheme={t}
                selected={t === theme}
                onClick={() => {
                  updateTheme(t)
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pb-16">
        {settings.dev && (
          <>
            <H2>Raw</H2>
            <div>
              <pre>{`${JSON.stringify(settings, null, 2)}`}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
