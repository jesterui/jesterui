import React, { useEffect, useState } from 'react'

import { useSettings, Subscription } from '../../context/SettingsContext'
import { useOutgoingNostrEvents } from '../../context/NostrEventsContext'
import { useUpdateSubscription } from '../../context/NostrSubscriptionsContext'
import * as NIP01 from '../../util/nostr/nip01'
import * as AppUtils from '../../util/pgnrui'

const FILTER_TIME_IN_MINUTES = process.env.NODE_ENV === 'development' ? 1 : 10
const FILTER_TIME_IN_SECONDS = FILTER_TIME_IN_MINUTES * 60

export const createSinceFilterValue = () => {
  const now = new Date()
  const filterDateBase = new Date(now.getTime() - FILTER_TIME_IN_SECONDS * 1_000)
  const filterDate = new Date(
    Date.UTC(
      filterDateBase.getUTCFullYear(),
      filterDateBase.getUTCMonth(),
      filterDateBase.getUTCDate(),
      filterDateBase.getUTCHours(),
      filterDateBase.getUTCMinutes(),
      0
    )
  )
  const seconds = Math.floor(filterDate.getTime() / 1_000)
  return seconds - (seconds % FILTER_TIME_IN_SECONDS)
}
/*
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
*/
export default function NostrManageSubscriptions() {
  const settings = useSettings()
  const updateSubscription = useUpdateSubscription()

  const [gameStartFilters] = useState<NIP01.Filter[]>([{
        ...AppUtils.PGNRUI_START_GAME_FILTER,
        since: createSinceFilterValue(),
      },
    ])

  const [currentGameFilters, setCurrentGameFilters] = useState<NIP01.Filter[]>([])

  useEffect(() => {
    updateSubscription({
      id: 'game_start',
      filters: gameStartFilters
    })
  }, [gameStartFilters, updateSubscription])

  useEffect(() => {
    updateSubscription({
      id: 'current_game',
      filters: currentGameFilters
    })
  }, [currentGameFilters, updateSubscription])

  useEffect(() => {
    if (settings.currentGameId) {
      setCurrentGameFilters(AppUtils.createGameFilterByGameId(settings.currentGameId))
    } else {
      setCurrentGameFilters([])
    }
  }, [settings])

  return (<></>)
  /*const settings = useSettings()
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

  return <></>*/
}
