import React, { createContext, useState, useContext, ProviderProps, useEffect } from 'react'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { useWebsocket, send as websocketSend } from '../context/WebsocketContext'

type WithAbortSignal = {
  signal: AbortSignal
}

export class EventBus<DetailType = any> {
  private eventTarget: EventTarget
  constructor(description: string) {
    this.eventTarget = document.appendChild(document.createComment(description))
  }
  on(type: string, listener: (event: CustomEvent<DetailType>) => void, { signal }: WithAbortSignal) {
    this.eventTarget.addEventListener(type, (e) => listener(e as CustomEvent<DetailType>), { signal })
  }
  once(type: string, listener: (event: CustomEvent<DetailType>) => void, { signal }: WithAbortSignal) {
    this.eventTarget.addEventListener(type, (e) => listener(e as CustomEvent<DetailType>), { signal, once: true })
  }
  off(type: string, listener: (event: CustomEvent<DetailType>) => void) {
    this.eventTarget.removeEventListener(type, (e) => listener(e as CustomEvent<DetailType>))
  }
  emit(type: string, detail?: DetailType) {
    return this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }))
  }
}

interface NostrEventsEntry {
  events: EventBus
}

const EVENT_BUS = new EventBus<NIP01.Event>('nostr-event-bus')

const NostrEventsContext = createContext<NostrEventsEntry | undefined>(undefined)

const NostrEventsProvider = ({ children }: ProviderProps<NostrEventsEntry | undefined>) => {
  const websocket = useWebsocket()

  useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()

    // Publish from internal event bus to relay via websocket
    EVENT_BUS.on(
      'EVENT',
      ({ detail: signedEvent }) => {
        if (!websocket) return

        const isValidEvent = NostrEvents.validateEvent(signedEvent)
        if (!isValidEvent) {
          console.warn('[Nostr] Invalid outgoing event from internal event bus - wont emit to relay')
          return
        }

        const req = NIP01.createClientEventMessage(signedEvent)
        console.debug('[Nostr] -> ', req)
        !abortCtrl.signal.aborted && websocketSend(websocket, req, { signal: abortCtrl.signal })
      },
      { signal: abortCtrl.signal }
    )

    // Publish from relay over websocket to internal event bus
    websocket.addEventListener(
      'message',
      ({ data: json }) => {
        const data = JSON.parse(json) as NIP01.RelayMessage
        if (!Array.isArray(data) || data.length !== 3) return
        if (data[0] !== NIP01.RelayEventType.EVENT) return

        const event = data[2] as NIP01.Event

        const isValidEvent = NostrEvents.validateEvent(event)
        if (!isValidEvent) {
          console.warn('[Nostr] Invalid incoming event from relay - wont emit on internal event bus')
          return
        }

        console.debug('[Nostr] <- ', data)
        !abortCtrl.signal.aborted && EVENT_BUS.emit('EVENT', event)
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [websocket])

  return <NostrEventsContext.Provider value={{ events: EVENT_BUS }}>{children}</NostrEventsContext.Provider>
}

const useNostrEvents = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useNostrEvents must be used within a GamesProvider')
  }

  return context.events
}

export { NostrEventsContext, NostrEventsProvider, useNostrEvents }
