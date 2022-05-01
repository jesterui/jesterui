import React, { createContext, ProviderProps, useEffect } from 'react'

import * as NIP01 from '../util/nostr/nip01'
import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { NostrEventRef, db } from '../util/nostr_db'

interface NostrStoreEntry {}

const NostrStoreContext = createContext<NostrStoreEntry | undefined>(undefined)

const NostrStoreProvider = ({ children }: ProviderProps<NostrStoreEntry | undefined>) => {
  const incomingNostr = useIncomingNostrEvents()

  useEffect(() => {
    if (!incomingNostr) return

    const abortCtrl = new AbortController()
    incomingNostr.on(
      NIP01.RelayEventType.EVENT,
      (event: CustomEvent<NIP01.RelayMessage>) => {
        if (event.type !== NIP01.RelayEventType.EVENT) return

        const req = event.detail as NIP01.RelayEventMessage
        const nostrEvent: NIP01.Event = req[2]

        const targetEventRefs = nostrEvent.tags.filter((t) => t && t[0] === 'e').map((t) => t[1] as NIP01.EventId)
        const nostrEventRefs: NostrEventRef = { sourceId: nostrEvent.id, targetIds: targetEventRefs }

        db.transaction('rw', db.nostr_events, db.nostr_event_refs, () => {
          return db.nostr_events.put(nostrEvent)
          .then((val) => {
            console.debug('added event', val)
            return val
          })
          .then((_) => db.nostr_event_refs.put(nostrEventRefs))
          .then((val) => {
            console.debug('added event refs', val)
            return val
          })
        })
        .catch((e) => console.error('error while adding event', e))

        
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [incomingNostr])

  return (
    <>
      <NostrStoreContext.Provider value={{}}>{children}</NostrStoreContext.Provider>
    </>
  )
}

export { NostrStoreContext, NostrStoreProvider }
