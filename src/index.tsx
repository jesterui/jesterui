import { prepareSecp256k1 } from './util'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import { AppSettings, SettingsProvider } from './context/SettingsContext'
import { WebsocketProvider } from './context/WebsocketContext'
import { NostrEventsProvider } from './context/NostrEventsContext'
import { NostrStoreProvider } from './context/NostrStoreContext'
import { NostrSubscriptionsProvider } from './context/NostrSubscriptionsContext'
import { GameEventStoreProvider } from './context/GameEventStoreContext'
import { JesterBotProvider } from './context/JesterBotContext'
import App from './App'

import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import './index.css'

prepareSecp256k1()

declare global {
  interface AppGlobal {
    PUBLIC_PATH: string
    SETTINGS_STORE_KEY: string
    THEMES: ['light', 'dark']
  }

  interface Window {
    APP: AppGlobal
  }
}



const DEFAULT_BOT_NAME = 'Risky Alice'

const defaultAppSettings: AppSettings = {
  dev: process.env.NODE_ENV === 'development',
  theme: 'dark',
  relays: [
    // 'wss://relayer.fiatjaf.com', // good uptime
    // 'wss://nostr.rocks', // bad uptime - TODO: remove after testing
  ],
  botName: DEFAULT_BOT_NAME,
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <>
    <StrictMode>
      {/*Using HashRouter for GitHub Pages compatibility */}
      <HashRouter>
        <SettingsProvider value={{ defaultValues: defaultAppSettings }}>
          <WebsocketProvider value={undefined}>
            <NostrEventsProvider value={undefined}>
              <NostrStoreProvider value={undefined}>
                <GameEventStoreProvider value={undefined}>
                  <NostrSubscriptionsProvider value={undefined}>
                    <JesterBotProvider value={{ defaultBotName: DEFAULT_BOT_NAME }}></JesterBotProvider>
                    <App />
                  </NostrSubscriptionsProvider>
                </GameEventStoreProvider>
              </NostrStoreProvider>
            </NostrEventsProvider>
          </WebsocketProvider>
        </SettingsProvider>
      </HashRouter>
    </StrictMode>
  </>
)
