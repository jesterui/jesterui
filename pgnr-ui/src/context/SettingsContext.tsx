import React, { ProviderProps, createContext, useReducer, useEffect, useContext } from 'react'

import * as NIP01 from '../util/nostr/nip01'

const localStorageKey = window.APP.SETTINGS_STORE_KEY

// TODO: add {read: true, write: true} to relay
type Relay = string
type Identity = {
  pubkey: string
}

export interface AppSettings {
  dev: boolean
  relays: Relay[]
  identity?: Identity
  botName: string | null,
  currentGameId?: NIP01.EventId
}

const initialSettings: AppSettings = {
  dev: process.env.NODE_ENV === 'development',
  relays: [
    // 'wss://relayer.fiatjaf.com', // good uptime
    // 'wss://nostr.rocks', // bad uptime - TODO: remove after testing
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
