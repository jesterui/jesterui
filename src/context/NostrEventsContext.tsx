import { createContext, useContext, ProviderProps, useEffect, useState } from 'react'
import { Dexie, DexieEvent } from 'dexie'

import { useWebsocket, send as websocketSend } from '../context/WebsocketContext'

import { once } from '../util/utils'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'

type WithAbortSignal = {
  signal: AbortSignal
}

export class IncomingNostrEventBus {
  private incomingEvent: DexieEvent
  private incomingNotice: DexieEvent

  constructor() {
    const events = Dexie.Events(this)
    this.incomingEvent = events.addEventType(NIP01.RelayEventType.EVENT)
    this.incomingNotice = events.addEventType(NIP01.RelayEventType.NOTICE)
  }
  _handler(type: NIP01.RelayEventType) {
    switch (type) {
      case NIP01.RelayEventType.EVENT:
        return this.incomingEvent
      case NIP01.RelayEventType.NOTICE:
        return this.incomingNotice
      default:
        throw new Error(`Cannot handle event type`)
    }
  }
  on(
    type: NIP01.RelayEventType,
    listener: (event: CustomEvent<NIP01.RelayMessage>) => void,
    { signal }: WithAbortSignal
  ) {
    const handler = this._handler(type)
    handler.subscribe(listener)
    signal.addEventListener('abort', (_) => handler.unsubscribe(listener))
  }

  emit(type: NIP01.RelayEventType, detail?: NIP01.RelayMessage) {
    const handler = this._handler(type)
    return handler.fire(
      new CustomEvent(type, {
        bubbles: false,
        cancelable: false,
        composed: false,
        detail,
      })
    )
  }
}

export class OutgoingNostrEventBus {
  private outgoingEvent: DexieEvent
  private outgoingClose: DexieEvent
  private outgoingReq: DexieEvent

  constructor() {
    const events = Dexie.Events(this)
    this.outgoingEvent = events.addEventType(NIP01.ClientEventType.EVENT)
    this.outgoingClose = events.addEventType(NIP01.ClientEventType.CLOSE)
    this.outgoingReq = events.addEventType(NIP01.ClientEventType.REQ)
  }
  _handler(type: NIP01.ClientEventType) {
    switch (type) {
      case NIP01.ClientEventType.EVENT:
        return this.outgoingEvent
      case NIP01.ClientEventType.CLOSE:
        return this.outgoingClose
      case NIP01.ClientEventType.REQ:
        return this.outgoingReq
      default:
        throw new Error(`Cannot handle event type`)
    }
  }
  on(
    type: NIP01.ClientEventType,
    listener: (event: CustomEvent<NIP01.ClientMessage>) => void,
    { signal }: WithAbortSignal
  ) {
    const handler = this._handler(type)
    handler.subscribe(listener)
    signal.addEventListener('abort', (_) => handler.unsubscribe(listener))
  }

  emit(type: NIP01.ClientEventType, detail?: NIP01.ClientMessage) {
    const handler = this._handler(type)
    return handler.fire(
      new CustomEvent(type, {
        bubbles: false,
        cancelable: false,
        composed: false,
        detail,
      })
    )
  }
}

interface NostrEventsEntry {
  incoming: IncomingNostrEventBus | null
  outgoing: OutgoingNostrEventBus | null
  incomingBuffer: NostrEventBuffer
}

interface NostrEventDictionary {
  [id: NIP01.EventId]: NIP01.Event
}

export interface NostrEventBufferState {
  latest: NIP01.Event | null
  order: NIP01.EventId[] // this is the order in which the events arrived
  // TODO: add a field holding ids sorted by "created_at"
  events: NostrEventDictionary
}

interface NostrEventBuffer {
  state(): NostrEventBufferState
  add(event: NIP01.Event): NostrEventBuffer
}

class NostrEventBufferImpl implements NostrEventBuffer {
  private maxEvents = 10

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

    const slicedOrder = this._state.order.slice(0, this.maxEvents - 1)
    const slicedEvents = slicedOrder.map((it) => this._state.events[it]).reduce((acc, obj) => ({ ...acc, ...obj }), {})

    return new NostrEventBufferImpl({
      latest: { ...event },
      order: [event.id, ...slicedOrder],
      events: { ...slicedEvents, [event.id]: event },
    })
  }
}

const NostrEventsContext = createContext<NostrEventsEntry | undefined>(undefined)

const NostrEventsProvider = ({ children }: ProviderProps<NostrEventsEntry | undefined>) => {
  const websocket = useWebsocket()
  const [incoming, setIncoming] = useState<IncomingNostrEventBus | null>(null)
  const [outgoing, setOutgoing] = useState<OutgoingNostrEventBus | null>(null)
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
    // view recent events..
    // e.g. what if a disconnect is only a few milliseconds?
    setIncomingBuffer(new NostrEventBufferImpl())

    const abortCtrl = new AbortController()

    // hack: use "once" as "StrictMode" will invoke "setState setter" twice - must be prevented otherwise events get emitted twice
    const setupIncomingEventBus = once<IncomingNostrEventBus>(() => {
      const newEventBus = new IncomingNostrEventBus()

      websocket.addEventListener(
        'message',
        async (event) => {
          const data = JSON.parse(event.data) as NIP01.RelayMessage
          if (!Array.isArray(data) || data.length !== 3) return
          if (data[0] !== NIP01.RelayEventType.EVENT) return

          const nostrEvent = data[2] as NIP01.Event

          const isValidEvent = NostrEvents.validateEvent(nostrEvent) && (await NostrEvents.verifySignature(nostrEvent))
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

    setIncoming((_) => {
      return setupIncomingEventBus()
    })

    // hack: use "once" as "StrictMode" will invoke "setState setter" twice - must be prevented otherwise events get emitted twice
    const setupOutgoingEventBus = once<OutgoingNostrEventBus>(() => {
      const newEventBus = new OutgoingNostrEventBus()
      // Publish from internal event bus to relay via websocket
      newEventBus.on(
        NIP01.ClientEventType.EVENT,
        async (event: CustomEvent<NIP01.ClientMessage>) => {
          if (!websocket) {
            console.warn('Websocket not ready yet')
            return
          }
          if (event.type !== NIP01.ClientEventType.EVENT) return
          const req = event.detail as NIP01.ClientEventMessage

          const signedEvent = req[1]
          const isValidEvent =
            NostrEvents.validateEvent(signedEvent) && (await NostrEvents.verifySignature(signedEvent))
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

    setOutgoing((_) => {
      return setupOutgoingEventBus()
    })

    return () => {
      abortCtrl.abort()

      setIncoming(null)
      setOutgoing(null)
    }
  }, [websocket])

  return (
    <>
      <NostrEventsContext.Provider value={{ incoming, outgoing, incomingBuffer }}>
        {children}
      </NostrEventsContext.Provider>
    </>
  )
}

const useIncomingNostrEvents = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useIncomingNostrEvents must be used within a NostrEventsProvider')
  }

  return context.incoming
}

const useIncomingNostrEventsBuffer = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useIncomingNostrEventsBuffer must be used within a NostrEventsProvider')
  }

  return context.incomingBuffer
}

const useOutgoingNostrEvents = () => {
  const context = useContext(NostrEventsContext)
  if (context === undefined) {
    throw new Error('useOutgoingNostrEvents must be used within a NostrEventsProvider')
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
