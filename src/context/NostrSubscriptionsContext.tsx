import { createContext, useCallback, useEffect, useState, useContext, ProviderProps } from 'react'

import { useOutgoingNostrEvents } from '../context/NostrEventsContext'

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
const arrayDeepEquals = (a: NIP01.Filter[], b: NIP01.Filter[]): boolean => {
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

  console.debug('[Subscription] new subs', newSubsBySubId)

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
  console.debug('[Subscription] new subs results in ', updates)

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
    console.debug('[Subscription] updateSubscription', sub)
    setNewSubscriptons((current) => {
      if (sub.filters.length === 0) {
        console.debug('[Subscription] removing', sub.id)
        return Object.fromEntries(Object.entries(current).filter(([id, _]) => id !== sub.id))
      } else {
        console.debug('[Subscription] adding', sub.id)
        return Object.fromEntries(Object.entries({ ...current, [sub.id]: sub }).sort())
      }
    })
  }, [])

  useEffect(() => {
    if (!outgoingNostr) return

    setCurrentSubscriptions(EMPTY_SUBSCRIPTION_MAP)
  }, [outgoingNostr])

  useEffect(() => {
    console.debug('[Subscription] new', newSubscriptions)
    if (!outgoingNostr) return
    if (currentSubscriptions === newSubscriptions) return

    const update = createSubscriptionUpdate(currentSubscriptions, newSubscriptions)
    setCurrentSubscriptions(newSubscriptions)
    setSubscriptionsUpdate(update)
  }, [outgoingNostr, currentSubscriptions, newSubscriptions])

  useEffect(() => {
    console.debug('[Subscription] update', subscriptionsUpdate)
    if (!outgoingNostr) return
    if (subscriptionsUpdate === EMPTY_UPDATE) return

    subscriptionsUpdate.close.forEach((sub) => {
      console.debug('[Subscription] close', sub)
      outgoingNostr.emit(NIP01.ClientEventType.CLOSE, NIP01.createClientCloseMessage(sub.id))
    })
    ;[...subscriptionsUpdate.refresh, ...subscriptionsUpdate.add].forEach((sub) => {
      console.debug('[Subscription] add', sub)
      outgoingNostr.emit(NIP01.ClientEventType.REQ, NIP01.createClientReqMessage(sub.id, sub.filters))
    })
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
