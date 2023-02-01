import { createContext, useContext, ProviderProps, useEffect } from 'react'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'

import * as NIP01 from '../util/nostr/nip01'
import { AppNostrDexie, NostrEventRef, db } from '../util/nostr_db'

interface NostrStoreEntry {
  db: AppNostrDexie
}

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

        db.transaction('rw', db.nostr_events, db.nostr_event_refs, () => {
          return db.nostr_events
            .put(nostrEvent)
            .then((val) => {
              console.debug('added event', val)
              return val
            })
            .then((_) => {
              const targetEventRefs = nostrEvent.tags.filter((t) => t && t[0] === 'e').map((t) => t[1] as NIP01.EventId)
              const nostrEventRefs: NostrEventRef = { sourceId: nostrEvent.id, targetIds: targetEventRefs }
              return db.nostr_event_refs.put(nostrEventRefs)
            })
            .then((val) => {
              console.debug('added event refs', val)
              return val
            })
            .catch((e) => console.debug('error while adding event - might already exist', e))
        })
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [incomingNostr])

  return (
    <>
      <NostrStoreContext.Provider value={{ db }}>{children}</NostrStoreContext.Provider>
    </>
  )
}

const useNostrStore = () => {
  const context = useContext(NostrStoreContext)
  if (context === undefined) {
    throw new Error('useNostrStore must be used within a NostrStoreProvider')
  }

  return context.db
}

export { NostrStoreContext, NostrStoreProvider, useNostrStore }
