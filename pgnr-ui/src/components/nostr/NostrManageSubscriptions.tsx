import React, { useEffect, useState } from 'react'

import { useSettings } from '../../context/SettingsContext'
import { useUpdateSubscription } from '../../context/NostrSubscriptionsContext'
import * as NIP01 from '../../util/nostr/nip01'
import * as JesterUtils from '../../util/jester'
import { getSession } from '../../util/session'

const FILTER_TIME_IN_MINUTES = process.env.NODE_ENV === 'development' ? 5 : 2

const createPrivateGameStartFilterOrEmpty = (publicKey: NIP01.PubKey | null): NIP01.Filter[] => {
  if (!publicKey) {
    return []
  }
  
  return publicKey ? [{
    ...JesterUtils.createPrivateGameStartFilter(publicKey),
    since: createSinceFilterValue(FILTER_TIME_IN_MINUTES),
  },
  ] : []
}

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

  const currentGameJesterId = settings.currentGameJesterId
  const publicKeyOrNull = settings.identity?.pubkey || null

  const [gameStartFilters] = useState<NIP01.Filter[]>([
    {
      ...JesterUtils.JESTER_START_GAME_FILTER,
      since: createSinceFilterValue(FILTER_TIME_IN_MINUTES),
    },
  ])

  const [privateGameStartFilters, setPrivateGameStartFilters] = useState<NIP01.Filter[]>(
    createPrivateGameStartFilterOrEmpty(publicKeyOrNull)
  )

  const [currentGameFilters, setCurrentGameFilters] = useState<NIP01.Filter[]>([])

  useEffect(() => {
    updateSubscription({
      id: 'game_start',
      filters: gameStartFilters,
    })
  }, [gameStartFilters, updateSubscription])
  
  // todo: maybe try to incooporate into "game_start"
  useEffect(() => {
    updateSubscription({
      id: 'game_start2',
      filters: privateGameStartFilters,
    })
  }, [privateGameStartFilters, updateSubscription])

  useEffect(() => {
    updateSubscription({
      id: 'current_game',
      filters: currentGameFilters,
    })
  }, [currentGameFilters, updateSubscription])

  useEffect(() => {
    if (currentGameJesterId) {
      const currentGameId = JesterUtils.jesterIdToGameId(currentGameJesterId)
      setCurrentGameFilters(JesterUtils.createGameFilterByGameId(currentGameId))
    } else {
      setCurrentGameFilters([])
    }
  }, [currentGameJesterId])

  useEffect(() => {
    const newFilterOrEmpty = createPrivateGameStartFilterOrEmpty(publicKeyOrNull)
    setPrivateGameStartFilters(newFilterOrEmpty)
  }, [publicKeyOrNull])


  return <></>
}
