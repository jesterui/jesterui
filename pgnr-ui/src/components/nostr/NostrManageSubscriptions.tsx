import React, { useEffect, useState } from 'react'

import { useSettings, Subscription } from '../../context/SettingsContext'
import { useOutgoingNostrEvents } from  '../../context/NostrEventsContext'
import * as NIP01 from '../../util/nostr/nip01'
import { arrayEquals } from '../../util/utils'

export default 
function NostrManageSubscriptions() {
  const settings = useSettings()
  const outgoingNostr = useOutgoingNostrEvents()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [closeSubscriptions, setCloseSubscriptions] = useState<Subscription[]>([])

  useEffect(() => {
    if (!outgoingNostr) return
    if (closeSubscriptions.length === 0) return

    const abortCtrl = new AbortController()

    closeSubscriptions.forEach((sub) => {
      outgoingNostr.emit('CLOSE', NIP01.createClientCloseMessage(sub.id))
    })

    setCloseSubscriptions([])
    return () => abortCtrl.abort()
  }, [closeSubscriptions, outgoingNostr])

  useEffect(() => {
    if (!outgoingNostr) return
    if (subscriptions.length === 0) return

    const abortCtrl = new AbortController()

    subscriptions.forEach((sub) => {
      outgoingNostr.emit('REQ', NIP01.createClientReqMessage(sub.id, sub.filters))
    })

    return () => abortCtrl.abort()
  }, [outgoingNostr, subscriptions])

  // initialize subscriptons based on settings
  useEffect(() => {
    const subscriptionsFromSettings = settings.subscriptions || []
    const resubscribe = !arrayEquals(subscriptions, subscriptionsFromSettings)

    if (resubscribe) {
      console.log('[Nostr] Will resubscribe..', subscriptionsFromSettings)
      setSubscriptions((currentSubs) => {
        const newSubs = [...subscriptionsFromSettings]
        const newSubsIds = newSubs.map((s) => s.id)
        const closeSubs = currentSubs.filter((val) => !newSubsIds.includes(val.id))

        setCloseSubscriptions(closeSubs)

        return newSubs
      })
    }
  }, [subscriptions, settings])

  return <></>
}
