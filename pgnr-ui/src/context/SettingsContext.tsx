import React, { ProviderProps, createContext, useReducer, useEffect, useContext } from 'react'

import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/pgnrui'

const localStorageKey = window.APP.SETTINGS_STORE_KEY

// TODO: add {read: true, write: true} to relay
type Relay = string
type Identity = {
  pubkey: string
}

export type Subscription = {
  id: NIP01.SubscriptionId
  filters: NIP01.Filter[]
}

interface AppSettings {
  dev: boolean
  relays: Relay[]
  identity?: Identity
  subscriptions?: Subscription[]
}

const initialSettings: AppSettings = {
  dev: true,
  relays: [
    // 'wss://relayer.fiatjaf.com', // good uptime
    // 'wss://nostr.rocks', // bad uptime - TODO: remove after testing
  ],
  subscriptions: [
    {
      id: 'my-sub',
      filters: [AppUtils.PGNRUI_START_GAME_FILTER],
    },
  ],
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
