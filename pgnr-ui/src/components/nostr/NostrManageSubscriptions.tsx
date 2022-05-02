import React, { useEffect, useState } from 'react'

import { useSettings, Subscription } from '../../context/SettingsContext'
import { useOutgoingNostrEvents } from '../../context/NostrEventsContext'
import * as NIP01 from '../../util/nostr/nip01'

type SubscriptionMap = {[key: NIP01.SubscriptionId]: Subscription}

type SubscriptionUpdates = {
  same: Subscription[]
  close: Subscription[]
  refresh: Subscription[]
  add: Subscription[]
}

const createSubscriptionUpdate = (sourceSubs: Subscription[], targetSubs: Subscription[]): SubscriptionUpdates => {
  const existingSubsBySubId = Object.fromEntries(Object.entries(sourceSubs
    .reduce((acc, obj) => ({ ...acc, [obj.id]: obj }), {} as SubscriptionMap)).sort())
  const newSubsBySubId = Object.fromEntries(Object.entries(targetSubs
    .reduce((acc, obj) => ({ ...acc, [obj.id]: obj }), {} as SubscriptionMap)).sort())
  
  const updates =  {
      same: [],
      close: [],
      refresh: [],
      add: [],
    } as SubscriptionUpdates
  
  Object.entries(newSubsBySubId).forEach(([id, sub]) => {
    if (existingSubsBySubId[id] === undefined) {
      updates.add.push(sub)
    } else if (JSON.stringify(existingSubsBySubId[id].filters) === JSON.stringify(sub.filters)) {
      updates.same.push(sub)
    } else {
      if (sub.filters.length === 0) {
        updates.close.push(sub)
      } else {
        updates.refresh.push(sub)
      }
    }
  })
  Object.entries(existingSubsBySubId).forEach(([id, sub]) => {
    if (newSubsBySubId[id] === undefined) {
      updates.close.push(sub)
    }
  })

  return updates
}

export default function NostrManageSubscriptions() {
  const settings = useSettings()
  const outgoingNostr = useOutgoingNostrEvents()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [subscriptionUpdates, setSubscriptionUpdates] = useState<SubscriptionUpdates>({
    same: [],
    close: [],
    refresh: [],
    add: [],
  })

  useEffect(() => {
    if (!outgoingNostr) return
    
    subscriptionUpdates.close.forEach((sub) => {
      outgoingNostr.emit(NIP01.ClientEventType.CLOSE, NIP01.createClientCloseMessage(sub.id))
    })

    {[...subscriptionUpdates.refresh, ...subscriptionUpdates.add].forEach((sub) => {
      outgoingNostr.emit(NIP01.ClientEventType.REQ, NIP01.createClientReqMessage(sub.id, sub.filters))
    })}

    const currentSubs = [...subscriptionUpdates.same, ...subscriptionUpdates.refresh, ...subscriptionUpdates.add]
    setSubscriptions(currentSubs)
  }, [outgoingNostr, subscriptionUpdates])

  // manage and update subscriptons based on settings
  useEffect(() => {
    const subscriptionsFromSettings = settings.subscriptions || []
    const update = createSubscriptionUpdate(subscriptions, subscriptionsFromSettings)
    const needsUpdate = update.close.length > 0 || update.refresh.length > 0 || update.add.length > 0
    
    if (needsUpdate) {
      console.log('[Nostr/Subscriptions] Will update subscriptions..', update)
      setSubscriptionUpdates(update)
    }
  }, [subscriptions, settings])

  return <></>
}
