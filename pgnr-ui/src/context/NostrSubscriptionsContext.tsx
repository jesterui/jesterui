import React, { createContext, useCallback, useEffect, useState, useContext, ProviderProps } from 'react'
import { useOutgoingNostrEvents } from './NostrEventsContext'

import * as NIP01 from '../util/nostr/nip01'

export type Subscription = {
  id: NIP01.SubscriptionId
  filters: NIP01.Filter[]
}

type SubscriptionMap = { [key: NIP01.SubscriptionId]: Subscription }

type SubscriptionUpdates = {
  close: Subscription[]
  refresh: Subscription[]
  add: Subscription[]
}

interface NostrSubscriptionsContextEntry {
  updateSubscription: (sub: Subscription) => void
}

// this is so stupid..
const arrayDeepEquals = (a: unknown[], b: unknown[]): boolean => {
  return JSON.stringify(a) === JSON.stringify(b)
}

const NostrSubscriptionsContext = createContext<NostrSubscriptionsContextEntry | undefined>(undefined)

const createSubscriptionUpdate = (
  existingSubsBySubId: SubscriptionMap,
  newSubsBySubId: SubscriptionMap
): SubscriptionUpdates => {
  const updates: SubscriptionUpdates = {
    close: [],
    refresh: [],
    add: [],
  }

  Object.entries(newSubsBySubId).forEach(([id, sub]) => {
    if (existingSubsBySubId[id] === undefined) {
      updates.add.push(sub)
    } else if (!arrayDeepEquals(existingSubsBySubId[id].filters, sub.filters)) {
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

const EMPTY_UPDATE = createSubscriptionUpdate({}, {})
const EMPTY_SUBSCRIPTION_MAP: SubscriptionMap = {}

const NostrSubscriptionsProvider = ({ children }: ProviderProps<NostrSubscriptionsContextEntry | undefined>) => {
  const outgoingNostr = useOutgoingNostrEvents()

  const [currentSubscriptions, setCurrentSubscriptions] = useState<SubscriptionMap>(EMPTY_SUBSCRIPTION_MAP)
  const [newSubscriptions, setNewSubscriptons] = useState<SubscriptionMap>(EMPTY_SUBSCRIPTION_MAP)
  const [subscriptionsUpdate, setSubscriptionsUpdate] = useState<SubscriptionUpdates>(EMPTY_UPDATE)

  const updateSubscription = useCallback((sub: Subscription) => {
    setNewSubscriptons((current) => {
      if (sub.filters.length === 0) {
        return Object.fromEntries(Object.entries(current).filter(([id, _]) => id !== sub.id))
      } else {
        return Object.fromEntries(Object.entries({ ...current, [sub.id]: sub }).sort())
      }
    })
  }, [])

  useEffect(() => {
    if (!outgoingNostr) return

    setCurrentSubscriptions(EMPTY_SUBSCRIPTION_MAP)
  }, [outgoingNostr])

  useEffect(() => {
    if (!outgoingNostr) return
    if (currentSubscriptions === newSubscriptions) return

    const update = createSubscriptionUpdate(currentSubscriptions, newSubscriptions)
    setSubscriptionsUpdate(update)
    setCurrentSubscriptions(newSubscriptions)
  }, [outgoingNostr, currentSubscriptions, newSubscriptions])

  useEffect(() => {
    if (!outgoingNostr) return
    if (subscriptionsUpdate === EMPTY_UPDATE) return

    {
      ;[...subscriptionsUpdate.refresh, ...subscriptionsUpdate.close].forEach((sub) => {
        outgoingNostr.emit(NIP01.ClientEventType.CLOSE, NIP01.createClientCloseMessage(sub.id))
      })
    }

    {
      ;[...subscriptionsUpdate.refresh, ...subscriptionsUpdate.add].forEach((sub) => {
        outgoingNostr.emit(NIP01.ClientEventType.REQ, NIP01.createClientReqMessage(sub.id, sub.filters))
      })
    }

    setSubscriptionsUpdate(EMPTY_UPDATE)
  }, [outgoingNostr, subscriptionsUpdate])

  return (
    <NostrSubscriptionsContext.Provider value={{ updateSubscription }}>{children}</NostrSubscriptionsContext.Provider>
  )
}

const useUpdateSubscription = () => {
  const context = useContext(NostrSubscriptionsContext)
  if (context === undefined) {
    throw new Error('useUpdateSubscription must be used within a NostrSubscriptionsProvider')
  }

  return context.updateSubscription
}

export { NostrSubscriptionsContext, NostrSubscriptionsProvider, useUpdateSubscription }
