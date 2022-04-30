import React, { ProviderProps, createContext, useReducer, useEffect, useContext } from 'react'

import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/pgnrui'

const FILTER_TIME_IN_MINUTES = process.env.NODE_ENV === 'development' ? 1 : 10
const FILTER_TIME_IN_SECONDS = FILTER_TIME_IN_MINUTES * 60
const localStorageKey = window.APP.SETTINGS_STORE_KEY

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

// TODO: add {read: true, write: true} to relay
type Relay = string
type Identity = {
  pubkey: string
}

export type Subscription = {
  id: NIP01.SubscriptionId
  filters: NIP01.Filter[]
}

export interface AppSettings {
  dev: boolean
  relays: Relay[]
  identity?: Identity
  subscriptions?: Subscription[]
  botName: string | null
}

const initialSettings: AppSettings = {
  dev: process.env.NODE_ENV === 'development',
  relays: [
    // 'wss://relayer.fiatjaf.com', // good uptime
    // 'wss://nostr.rocks', // bad uptime - TODO: remove after testing
  ],
  subscriptions: [
    {
      id: 'my-sub',
      filters: [
        {
          ...AppUtils.PGNRUI_START_GAME_FILTER,
          since: createSinceFilterValue(),
        },
      ],
    },
  ],
  botName: null,
}

interface AppSettingsEntry {
  settings: AppSettings
  dispatch: (value: AppSettings) => void
}

const SettingsContext = createContext<AppSettingsEntry | undefined>(undefined)

const settingsReducer = (oldSettings: AppSettings, action: AppSettings) => {
  const { ...newSettings } = action

  return {
    ...oldSettings,
    ...newSettings,
  }
}

const SettingsProvider = ({ children }: ProviderProps<AppSettingsEntry | undefined>) => {
  const [settings, dispatch] = useReducer(
    settingsReducer,
    Object.assign({}, initialSettings, JSON.parse(window.localStorage.getItem(localStorageKey) || '{}'))
  )

  useEffect(() => {
    window.localStorage.setItem(localStorageKey, JSON.stringify(settings))
  }, [settings])

  return <SettingsContext.Provider value={{ settings, dispatch }}>{children}</SettingsContext.Provider>
}

const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context.settings
}

const useSettingsDispatch = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettingsDispatch must be used within a SettingsProvider')
  }
  return context.dispatch
}

export { SettingsProvider, useSettings, useSettingsDispatch }
