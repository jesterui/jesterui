import React, { useEffect, useState } from 'react'

import { useSettings } from '../../context/SettingsContext'
import { useUpdateSubscription } from '../../context/NostrSubscriptionsContext'
import * as NIP01 from '../../util/nostr/nip01'
import * as AppUtils from '../../util/jester'

const FILTER_TIME_IN_MINUTES = process.env.NODE_ENV === 'development' ? 5 : 2

export const createSinceFilterValue = (minutesBack: number) => {
  const now = new Date()
  const filterDateBase = new Date(now.getTime() - minutesBack * 60 * 1_000)
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
  return seconds
}

export default function NostrManageSubscriptions() {
  const settings = useSettings()
  const updateSubscription = useUpdateSubscription()

  const [gameStartFilters] = useState<NIP01.Filter[]>([
    {
      ...AppUtils.JESTER_START_GAME_FILTER,
      since: createSinceFilterValue(FILTER_TIME_IN_MINUTES),
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
    if (settings.currentGameJesterId) {
      const currentGameId = AppUtils.jesterIdToGameId(settings.currentGameJesterId)
      setCurrentGameFilters(AppUtils.createGameFilterByGameId(currentGameId))
    } else {
      setCurrentGameFilters([])
    }
  }, [settings])

  return <></>
}
