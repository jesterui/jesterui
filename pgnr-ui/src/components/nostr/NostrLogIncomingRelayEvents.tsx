import React, { useEffect } from 'react'

import { useIncomingNostrEvents } from '../../context/NostrEventsContext'
import * as NIP01 from '../../util/nostr/nip01'

export default function NostrLogIncomingRelayEvents() {
  const incomingNostr = useIncomingNostrEvents()

  useEffect(() => {
    if (!incomingNostr) return

    const abortCtrl = new AbortController()
    incomingNostr.on(
      NIP01.RelayEventType.EVENT,
      (event: CustomEvent<NIP01.RelayMessage>) => {
        if (event.type !== NIP01.RelayEventType.EVENT) return
        const req = event.detail as NIP01.RelayEventMessage

        console.info(`[Nostr] LOGGING INCOMING EVENT`, req)
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [incomingNostr])

  useEffect(() => {
    if (!incomingNostr) return

    const abortCtrl = new AbortController()
    incomingNostr.on(
      NIP01.RelayEventType.NOTICE,
      (event: CustomEvent<NIP01.RelayMessage>) => {
        if (event.type !== NIP01.RelayEventType.NOTICE) return
        const req = event.detail as NIP01.RelayNoticeMessage

        console.info(`[Nostr] LOGGING INCOMING NOTICE`, req)
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [incomingNostr])

  return <></>
}
