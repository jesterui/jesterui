import React, { createContext, useContext, ProviderProps, useEffect } from 'react'

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
  incoming: EventBus<NIP01.RelayMessage>
  outgoing: EventBus<NIP01.ClientMessage>
}

const INCOMING_EVENT_BUS = new EventBus<NIP01.RelayMessage>('nostr-incoming-events')
const OUTGOING_EVENT_BUS = new EventBus<NIP01.ClientMessage>('nostr-outgoing-events')

const NostrEventsContext = createContext<NostrEventsEntry | undefined>(undefined)

const NostrEventsProvider = ({ children }: ProviderProps<NostrEventsEntry | undefined>) => {
  const websocket = useWebsocket()

  useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()

    // Publish from internal event bus to relay via websocket
    OUTGOING_EVENT_BUS.on(
      NIP01.ClientEventType.EVENT,
      (event: CustomEvent<NIP01.ClientMessage>) => {
        if (!websocket) return
        if (event.type !== NIP01.ClientEventType.EVENT) return
        const req = event.detail as NIP01.ClientEventMessage

        const signedEvent = req[1]
        const isValidEvent = NostrEvents.validateEvent(signedEvent)
        if (!isValidEvent) {
          console.warn('[Nostr] Invalid outgoing event from internal event bus - wont emit to relay')
          return
        }

        console.debug('[Nostr] -> ', req)
        !abortCtrl.signal.aborted && websocketSend(websocket, req, { signal: abortCtrl.signal })
      },
      { signal: abortCtrl.signal }
    )

    OUTGOING_EVENT_BUS.on(
      NIP01.ClientEventType.REQ,
      (event: CustomEvent<NIP01.ClientMessage>) => {
        if (!websocket) return
        if (event.type !== NIP01.ClientEventType.REQ) return
        const req = event.detail as NIP01.ClientReqMessage

        console.debug('[Nostr] -> ', req)
        !abortCtrl.signal.aborted && websocketSend(websocket, req, { signal: abortCtrl.signal })
      },
      { signal: abortCtrl.signal }
    )

    OUTGOING_EVENT_BUS.on(
      NIP01.ClientEventType.CLOSE,
      (event: CustomEvent<NIP01.ClientMessage>) => {
        if (!websocket) return
        if (event.type !== NIP01.ClientEventType.CLOSE) return
        const req = event.detail as NIP01.ClientCloseMessage

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
        !abortCtrl.signal.aborted && INCOMING_EVENT_BUS.emit('EVENT', data)
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [websocket])

  return (
    <NostrEventsContext.Provider
      value={{
        incoming: INCOMING_EVENT_BUS,
        outgoing: OUTGOING_EVENT_BUS,
      }}
    >
      {children}
    </NostrEventsContext.Provider>
  )
}

const useIncomingNostrEvents = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useIncomingNostrEvents must be used within a GamesProvider')
  }

  return context.incoming
}
const useOutgoingNostrEvents = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useOutgoingNostrEvents must be used within a GamesProvider')
  }

  return context.outgoing
}

export { NostrEventsContext, NostrEventsProvider, useIncomingNostrEvents, useOutgoingNostrEvents }
