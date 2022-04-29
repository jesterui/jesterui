import React, { createContext, useContext, ProviderProps, useEffect, useState, useRef } from 'react'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { db } from '../util/db'

interface NostrStoreEntry {
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

        db.nostr_events.put(nostrEvent)
          .then((val) => console.debug('adding event', val))
          .catch((e) => console.error('error while adding event', e))
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [incomingNostr])

  return (
    <>
      <NostrStoreContext.Provider value={{}}>
        {children}
      </NostrStoreContext.Provider>
    </>
  )
}

export {
  NostrStoreContext,
  NostrStoreProvider,
}
