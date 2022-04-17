import React, { createContext, useContext, ProviderProps, useEffect, useState, useRef } from 'react'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { useWebsocket, send as websocketSend } from '../context/WebsocketContext'

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

interface NostrEventsEntry {
  incoming: EventBus<NIP01.RelayMessage> | null
  outgoing: EventBus<NIP01.ClientMessage> | null
  incomingBuffer: NostrEventBuffer
}

interface NostrEventDictionary {
  [id: NIP01.Sha256]: NIP01.Event
}
interface NostrEventReferenceDictionary {
  [id: NIP01.Sha256]: NIP01.Sha256[]
}

export interface NostrEventBufferState {
  latest: NIP01.Event | null
  order: NIP01.Sha256[] // this is the order in which the events arrived - it holds event ids!
  // TODO: add a field holding ids sorted by "created_at"
  events: NostrEventDictionary
  refs: NostrEventReferenceDictionary
}

interface NostrEventBuffer {
  state(): NostrEventBufferState
  add(event: NIP01.Event): NostrEventBuffer
}

const findReferencing = (state: NostrEventBufferState, searchEventId: string) =>
  state.order
    .map((eventId) => state.events[eventId])
    .filter((event) => {
      // verify that there is an 'e' tag referencing the start event
      //const matchingTags = event.tags.filter((t) => t[0] === 'e' && t[1] === gameStartEventId)
      const searchEventIdRefFound = event.tags.filter((t) => t && t[0] === 'e' && t[1] === searchEventId).length > 0
      return searchEventIdRefFound
    })

// TODO: add a maximum amount of events -> forget "older" events
class NostrEventBufferImpl implements NostrEventBuffer {
  private _state: NostrEventBufferState = {
    latest: null,
    order: [],
    events: {},
    refs: {},
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
      const newRefs = { ...this._state.refs }

      const existingReferencedEvents = findReferencing(this._state, event.id)
      newRefs[event.id] = [...new Set([...(newRefs[event.id] || []), ...existingReferencedEvents.map((e) => e.id)])]

      const eventIdRefs = [...new Set(event.tags.filter((t) => t && t[0] === 'e').map((t) => t[1] as NIP01.Sha256))]
      eventIdRefs.forEach((refId) => {
        newRefs[refId] = [...(newRefs[refId] || []), event.id]
      })

      return new NostrEventBufferImpl({
        latest: { ...event },
        order: [event.id, ...this._state.order],
        events: { ...this._state.events, [event.id]: event },
        refs: newRefs,
      })
    }
  }
}

const NostrEventsContext = createContext<NostrEventsEntry | undefined>(undefined)

const createEventTarget = <T extends NIP01.RelayMessage | NIP01.ClientMessage>(node: Node) => {
  return new EventBus<T>(node)
}
const createIncoming = (node: Node) => {
  return createEventTarget<NIP01.RelayMessage>(node)
}
const createOutgoing = (node: Node) => {
  return createEventTarget<NIP01.ClientMessage>(node)
}

const NostrEventsProvider = ({ children }: ProviderProps<NostrEventsEntry | undefined>) => {
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
    // view received events..
    // currently, setting to new buffer ensures that no games are displayed
    // that have been received, but are not available on the newly connected relay
    // e.g. what if a disconnect is only a few milliseconds?
    setIncomingBuffer(new NostrEventBufferImpl())

    const abortCtrl = new AbortController()

    setIncoming((_) => {
      const newEventBus = createIncoming(incomingRef.current!)
      // Publish from relay over websocket to internal event bus
      websocket.addEventListener(
        'message',
        async (event) => {
          //event.stopPropagation()

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

    setOutgoing((_) => {
      const newEventBus = createOutgoing(outgoingRef.current!)
      // Publish from internal event bus to relay via websocket
      newEventBus.on(
        NIP01.ClientEventType.EVENT,
        async (event: CustomEvent<NIP01.ClientMessage>) => {
          //event.stopPropagation()

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

      setIncoming(null)
      setOutgoing(null)
    }
  }, [websocket])

  return (
    <>
      <div id="nostr-incoming-events" ref={incomingRef} style={{ display: 'none' }}></div>
      <div id="nostr-outgoing-events" ref={outgoingRef} style={{ display: 'none' }}></div>
      <NostrEventsContext.Provider value={{ incoming, outgoing, incomingBuffer }}>
        {children}
      </NostrEventsContext.Provider>
    </>
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
