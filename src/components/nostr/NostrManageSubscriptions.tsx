import { useEffect, useState, useMemo } from 'react'
import { bytesToHex, randomBytes } from '@noble/hashes/utils'

import { useSettings } from '../../context/SettingsContext'
import { useUpdateSubscription } from '../../context/NostrSubscriptionsContext'
import { hashWithSha256 } from '../../util/utils'
import * as NIP01 from '../../util/nostr/nip01'
import * as JesterUtils from '../../util/jester'
import { randomNumberBetween } from '../../util/app'

const FILTER_TIME_IN_MINUTES = process.env.NODE_ENV === 'development' ? 48 * 60 : 24 * 60
const FILTER_LIMIT = process.env.NODE_ENV === 'development' ? 512 : 256

const uniqueRandomStrings = (amount: number, maxStringLength: number) => {
  const arr: string[] = []
  if (amount < 0) throw new Error('`amount` must not be negative')
  if (amount === 0) return []

  let seed = hashWithSha256(bytesToHex(randomBytes(4)))
  while (arr.length < amount) {
    const test = seed.substring(0, randomNumberBetween(1, maxStringLength))
    if (!arr.includes(test)) {
      arr.push(test)
    }
    seed = hashWithSha256(seed)
  }

  return arr
}

const UNIQUE_RANDOM_STRINGS = uniqueRandomStrings(4, 10)
const RANDOMIZE_SUB_IDS = process.env.NODE_ENV !== 'development'
const GAME_START_SUB_ID = RANDOMIZE_SUB_IDS ? UNIQUE_RANDOM_STRINGS[0] : 'game_start'
const PRIVATE_GAME_START_SUB_ID = RANDOMIZE_SUB_IDS ? UNIQUE_RANDOM_STRINGS[1] : 'private_game_start'
const CURRENT_GAME_SUB_ID = RANDOMIZE_SUB_IDS ? UNIQUE_RANDOM_STRINGS[2] : 'current_game'
const CURRENT_GAME_CHAT_SUB_ID = RANDOMIZE_SUB_IDS ? UNIQUE_RANDOM_STRINGS[3] : 'current_chat'

const createPrivateGameStartFilterOrEmpty = (
  publicKey: NIP01.PubKey | null,
  sinceMinutesBack: number
): NIP01.Filter[] => {
  if (!publicKey) {
    return []
  }

  return publicKey
    ? [
        {
          ...JesterUtils.createPrivateGameStartFilter(publicKey),
          since: createSinceFilterValue(sinceMinutesBack),
          limit: FILTER_LIMIT,
        },
      ]
    : []
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

  const currentGameJesterId = useMemo(() => settings.currentGameJesterId, [settings])
  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])

  const [gameStartFilters] = useState<NIP01.Filter[]>([
    {
      ...JesterUtils.JESTER_START_GAME_FILTER,
      since: createSinceFilterValue(FILTER_TIME_IN_MINUTES),
      limit: FILTER_LIMIT,
    },
  ])

  const privateGameStartFilters = useMemo<NIP01.Filter[]>(() => {
    const minutesBack = 60 * 24 * 2 // 2 days
    return createPrivateGameStartFilterOrEmpty(publicKeyOrNull, minutesBack)
  }, [publicKeyOrNull])

  const [currentGameFilters, setCurrentGameFilters] = useState<NIP01.Filter[]>([])
  const [currentGameChatFilters, setCurrentGameChatFilters] = useState<NIP01.Filter[]>([])

  useEffect(() => {
    updateSubscription({
      id: GAME_START_SUB_ID,
      filters: gameStartFilters,
    })
  }, [gameStartFilters, updateSubscription])

  // todo: maybe try to incooporate into "game_start"
  useEffect(() => {
    updateSubscription({
      id: PRIVATE_GAME_START_SUB_ID,
      filters: privateGameStartFilters,
    })
  }, [privateGameStartFilters, updateSubscription])

  useEffect(() => {
    updateSubscription({
      id: CURRENT_GAME_SUB_ID,
      filters: currentGameFilters,
    })
  }, [currentGameFilters, updateSubscription])

  useEffect(() => {
    updateSubscription({
      id: CURRENT_GAME_CHAT_SUB_ID,
      filters: currentGameChatFilters,
    })
  }, [currentGameChatFilters, updateSubscription])

  useEffect(() => {
    if (currentGameJesterId) {
      const currentGameId = JesterUtils.jesterIdToGameId(currentGameJesterId)
      setCurrentGameFilters(JesterUtils.createGameFilterByGameId(currentGameId))
      setCurrentGameChatFilters(JesterUtils.createGameChatFilterByGameId(currentGameId))
    } else {
      setCurrentGameFilters([])
      setCurrentGameChatFilters([])
    }
  }, [currentGameJesterId])

  return <></>
}
