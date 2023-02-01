import { createContext, useContext, ProviderProps, useEffect, useState, useRef } from 'react'

import { useWebsocket, send as websocketSend } from '../context/WebsocketContext'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrDOMEvents from '../util/nostr/events'
import { once } from '../util/utils'

type WithAbortSignal = {
  signal: AbortSignal
}

export class EventBus<DetailType = any> {
  private eventTarget: Node
  constructor(eventTarget: Node) {
    this.eventTarget = eventTarget
  }
  on(type: string, listener: (event: CustomEvent<DetailType>) => void, { signal }: WithAbortSignal) {
    this.eventTarget.addEventListener(
      type,
      (e) => {
        e.stopPropagation()
        return listener(e as CustomEvent<DetailType>)
      },
      { signal }
    )
  }
  once(type: string, listener: (event: CustomEvent<DetailType>) => void, { signal }: WithAbortSignal) {
    this.eventTarget.addEventListener(
      type,
      (e) => {
        e.stopPropagation()
        return listener(e as CustomEvent<DetailType>)
      },
      { signal, once: true }
    )
  }
  emit(type: string, detail?: DetailType) {
    return this.eventTarget.dispatchEvent(
      new CustomEvent(type, {
        bubbles: false,
        cancelable: false,
        composed: false,
        detail,
      })
    )
  }
}

interface NostrDOMEventsEntry {
  incoming: EventBus<NIP01.RelayMessage> | null
  outgoing: EventBus<NIP01.ClientMessage> | null
  incomingBuffer: NostrEventBuffer
}

interface NostrEventDictionary {
  [id: Sha256]: NIP01.Event
}

export interface NostrEventBufferState {
  latest: NIP01.Event | null
  order: Sha256[] // this is the order in which the events arrived - it holds event ids!
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

const NostrDOMEventsContext = createContext<NostrDOMEventsEntry | undefined>(undefined)

const createEventTarget = <T extends NIP01.RelayMessage | NIP01.ClientMessage>(node: Node) => {
  return new EventBus<T>(node)
}
const createIncoming = (node: Node) => {
  return createEventTarget<NIP01.RelayMessage>(node)
}
const createOutgoing = (node: Node) => {
  return createEventTarget<NIP01.ClientMessage>(node)
}

const NostrDOMEventsProvider = ({ children }: ProviderProps<NostrDOMEventsEntry | undefined>) => {
  const websocket = useWebsocket()
  const [incoming, setIncoming] = useState<EventBus<NIP01.RelayMessage> | null>(null)
  const [outgoing, setOutgoing] = useState<EventBus<NIP01.ClientMessage> | null>(null)
  const [incomingBuffer, setIncomingBuffer] = useState<NostrEventBuffer>(new NostrEventBufferImpl())

  const incomingRef = useRef<HTMLDivElement>(null)
  const outgoingRef = useRef<HTMLDivElement>(null)

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
    const setupIncomingEventBus = once<EventBus<NIP01.RelayMessage>>((current: HTMLDivElement) => {
      const newEventBus = createIncoming(current)
      websocket.addEventListener(
        'message',
        (event) => {
          const data = JSON.parse(event.data) as NIP01.RelayMessage
          if (!Array.isArray(data) || data.length !== 3) return
          if (data[0] !== NIP01.RelayEventType.EVENT) return

          const nostrEvent = data[2] as NIP01.Event

          const isValidEvent = NostrDOMEvents.validateEvent(nostrEvent) && NostrDOMEvents.verifySignature(nostrEvent)
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
      return setupIncomingEventBus(incomingRef.current!)
    })

    // hack: use "once" as "StrictMode" will invoke "setState setter" twice - must be prevented otherwise events get emitted twice
    const setupOutgoingEventBus = once<EventBus<NIP01.ClientMessage>>((current: HTMLDivElement) => {
      const newEventBus = createOutgoing(current)
      // Publish from internal event bus to relay via websocket
      newEventBus.on(
        NIP01.ClientEventType.EVENT,
        (event: CustomEvent<NIP01.ClientMessage>) => {
          if (!websocket) {
            console.warn('Websocket not ready yet')
            return
          }
          if (event.type !== NIP01.ClientEventType.EVENT) return
          const req = event.detail as NIP01.ClientEventMessage

          const signedEvent = req[1]
          const isValidEvent = NostrDOMEvents.validateEvent(signedEvent) && NostrDOMEvents.verifySignature(signedEvent)
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
      return setupOutgoingEventBus(outgoingRef.current!)
    })

    return () => {
      abortCtrl.abort()

      setIncoming(null)
      setOutgoing(null)
    }
  }, [websocket])

  return (
    <>
      <div id="nostr-incoming-events" ref={incomingRef} style={{ display: 'none' }}></div>
      <div id="nostr-outgoing-events" ref={outgoingRef} style={{ display: 'none' }}></div>
      <NostrDOMEventsContext.Provider value={{ incoming, outgoing, incomingBuffer }}>
        {children}
      </NostrDOMEventsContext.Provider>
    </>
  )
}

const useIncomingNostrDOMEvents = () => {
  const context = useContext(NostrDOMEventsContext)
  if (context === undefined) {
    throw new Error('useIncomingNostrDOMEvents must be used within a NostrDOMEventsProvider')
  }

  return context.incoming
}

const useIncomingNostrDOMEventsBuffer = () => {
  const context = useContext(NostrDOMEventsContext)
  if (context === undefined) {
    throw new Error('useIncomingNostrDOMEventsBuffer must be used within a NostrDOMEventsProvider')
  }

  return context.incomingBuffer
}

const useOutgoingNostrDOMEvents = () => {
  const context = useContext(NostrDOMEventsContext)
  if (context === undefined) {
    throw new Error('useOutgoingNostrDOMEvents must be used within a NostrDOMEventsProvider')
  }

  return context.outgoing
}

export {
  NostrDOMEventsContext,
  NostrDOMEventsProvider,
  useIncomingNostrDOMEvents,
  useOutgoingNostrDOMEvents,
  useIncomingNostrDOMEventsBuffer,
}
