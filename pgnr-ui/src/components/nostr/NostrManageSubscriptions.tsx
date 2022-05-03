import React, { useEffect, useState } from 'react'

import { useSettings } from '../../context/SettingsContext'
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

export default function NostrManageSubscriptions() {
  const settings = useSettings()
  const updateSubscription = useUpdateSubscription()

  const [gameStartFilters] = useState<NIP01.Filter[]>([
    {
      ...AppUtils.PGNRUI_START_GAME_FILTER,
      since: createSinceFilterValue(),
    },
  ])

  const [currentGameFilters, setCurrentGameFilters] = useState<NIP01.Filter[]>([])

  useEffect(() => {
    updateSubscription({
      id: 'game_start',
      filters: gameStartFilters,
    })
  }, [gameStartFilters, updateSubscription])

  useEffect(() => {
    updateSubscription({
      id: 'current_game',
      filters: currentGameFilters,
    })
  }, [currentGameFilters, updateSubscription])

  useEffect(() => {
    if (settings.currentGameId) {
      setCurrentGameFilters(AppUtils.createGameFilterByGameId(settings.currentGameId))
    } else {
      setCurrentGameFilters([])
    }
  }, [settings])

  return <></>
}
