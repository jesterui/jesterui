import React, { createContext, useContext, ProviderProps, useEffect, useState } from 'react'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { useWebsocket, send as websocketSend } from '../context/WebsocketContext'

type WithAbortSignal = {
  signal: AbortSignal
}

export class EventBus<DetailType = any> {
  private eventTarget: Node
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

  destroy() {
    if (document.contains(this.eventTarget)) {
      console.debug('[Nostr] Removing event bus', this.eventTarget.nodeValue)
      document.removeChild(this.eventTarget)
    }
  }
}

interface NostrEventsEntry {
  incoming: EventBus<NIP01.RelayMessage> | null
  outgoing: EventBus<NIP01.ClientMessage> | null
  incomingBuffer: NostrEventBuffer
}
interface NostrEventDictionary {
  [id: NIP01.Sha256]: NIP01.Event
}

interface NostrEventBufferState {
  latest: NIP01.Event | null
  order: NIP01.Sha256[] // this is the order in which the events arrived
  // TODO: add a field olding ids sorted by "created_at"
  events: NostrEventDictionary
}

interface NostrEventBuffer {
  state(): NostrEventBufferState
  add(event: NIP01.Event): NostrEventBuffer
}

// TODO: add a maximum amount of events -> forget "older" events
class NostrEventBufferImpl implements NostrEventBuffer {
  private _state: NostrEventBufferState = {
    latest: null,
    order: [],
    events: {},
  }

  constructor(copy?: NostrEventBufferState) {
    if (copy) {
      this._state = copy
    }
  }

  state(): NostrEventBufferState {
    return { ...this._state }
  }

  add(event: NIP01.Event): NostrEventBuffer {
    if (!event) throw new Error('Event cannot be added')

    const eventExists = !!this._state.events[event.id]
    if (eventExists) {
      return this
    } else {
      return new NostrEventBufferImpl({
        latest: { ...event },
        order: [event.id, ...this._state.order],
        events: { ...this._state.events, [event.id]: event },
      })
    }
  }
}

const NostrEventsContext = createContext<NostrEventsEntry | undefined>(undefined)

const createEventTarget = <T extends NIP01.RelayMessage | NIP01.ClientMessage>(id: string) => {
  return new EventBus<T>(id)
}
const createIncoming = () => {
  return createEventTarget<NIP01.RelayMessage>('nostr-incoming-events-' + Date.now())
}
const createOutgoing = () => {
  return createEventTarget<NIP01.ClientMessage>('nostr-outgoing-events-' + Date.now())
}

const NostrEventsProvider = ({ children }: ProviderProps<NostrEventsEntry | undefined>) => {
  const websocket = useWebsocket()
  const [incoming, setIncoming] = useState<EventBus<NIP01.RelayMessage> | null>(null)
  const [outgoing, setOutgoing] = useState<EventBus<NIP01.ClientMessage> | null>(null)
  const [incomingBuffer, setIncomingBuffer] = useState<NostrEventBuffer>(new NostrEventBufferImpl())

  useEffect(() => {
    if (!websocket) {
      setIncoming(null)
      setOutgoing(null)
      return
    }

    // TODO: save the current buffer by host connection
    // currently, we just forget the whole buffer - which is safe, but uncool..
    // it would be great to be handle websocket disconnects while still being able to
    // view received events..
    // currently, setting to new buffer ensures that no games are displayed
    // that have been received, but are not available on the newly connected relay
    // e.g. what if a disconnect is only a few milliseconds?
    setIncomingBuffer(new NostrEventBufferImpl())

    const abortCtrl = new AbortController()

    setIncoming((_) => {
      const newEventBus = createIncoming()
      // Publish from relay over websocket to internal event bus
      websocket.addEventListener(
        'message',
        (event) => {
          //event.stopPropagation()

          const data = JSON.parse(event.data) as NIP01.RelayMessage
          if (!Array.isArray(data) || data.length !== 3) return
          if (data[0] !== NIP01.RelayEventType.EVENT) return

          const nostrEvent = data[2] as NIP01.Event

          const isValidEvent = NostrEvents.validateEvent(nostrEvent)
          if (!isValidEvent) {
            console.warn('[Nostr] Invalid incoming event from relay - wont emit on internal event bus')
            return
          }

          console.debug('[Nostr] <- ', data)
          if (!abortCtrl.signal.aborted) {
            setIncomingBuffer((current) => current.add(nostrEvent))
            newEventBus.emit(NIP01.RelayEventType.EVENT, data)
          }
        },
        { signal: abortCtrl.signal }
      )
      return newEventBus
    })

    setOutgoing((_) => {
      const newEventBus = createOutgoing()
      // Publish from internal event bus to relay via websocket
      newEventBus.on(
        NIP01.ClientEventType.EVENT,
        (event: CustomEvent<NIP01.ClientMessage>) => {
          //event.stopPropagation()

          if (!websocket) {
            console.warn('Websocket not ready yet')
            return
          }
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

      newEventBus.on(
        NIP01.ClientEventType.REQ,
        (event: CustomEvent<NIP01.ClientMessage>) => {
          //event.stopPropagation()

          if (!websocket) {
            console.warn('Websocket not ready yet')
            return
          }

          if (event.type !== NIP01.ClientEventType.REQ) return
          const req = event.detail as NIP01.ClientReqMessage

          console.debug('[Nostr] -> ', req)
          !abortCtrl.signal.aborted && websocketSend(websocket, req, { signal: abortCtrl.signal })
        },
        { signal: abortCtrl.signal }
      )

      newEventBus.on(
        NIP01.ClientEventType.CLOSE,
        (event: CustomEvent<NIP01.ClientMessage>) => {
          //event.stopPropagation()

          if (!websocket) {
            console.warn('Websocket not ready yet')
            return
          }
          if (event.type !== NIP01.ClientEventType.CLOSE) return
          const req = event.detail as NIP01.ClientCloseMessage

          console.debug('[Nostr] -> ', req)
          !abortCtrl.signal.aborted && websocketSend(websocket, req, { signal: abortCtrl.signal })
        },
        { signal: abortCtrl.signal }
      )

      return newEventBus
    })

    return () => {
      abortCtrl.abort()

      setIncoming((current) => {
        current && current.destroy()
        return null
      })
      setOutgoing((current) => {
        current && current.destroy()
        return null
      })
    }
  }, [websocket])

  return (
    <NostrEventsContext.Provider value={{ incoming, outgoing, incomingBuffer }}>{children}</NostrEventsContext.Provider>
  )
}

const useIncomingNostrEvents = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useIncomingNostrEvents must be used within a GamesProvider')
  }

  return context.incoming
}

const useIncomingNostrEventsBuffer = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useIncomingNostrEventsBuffer must be used within a GamesProvider')
  }

  return context.incomingBuffer
}

const useOutgoingNostrEvents = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useOutgoingNostrEvents must be used within a GamesProvider')
  }

  return context.outgoing
}

export {
  NostrEventsContext,
  NostrEventsProvider,
  useIncomingNostrEvents,
  useOutgoingNostrEvents,
  useIncomingNostrEventsBuffer,
}
