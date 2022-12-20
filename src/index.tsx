import React from 'react'
import ReactDOM from 'react-dom'
import { HashRouter } from 'react-router-dom'

import './index.css'
import '@material-tailwind/react/tailwind.css'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import App from './App'

import { SettingsProvider } from './context/SettingsContext'
import { WebsocketProvider } from './context/WebsocketContext'
import { NostrEventsProvider } from './context/NostrEventsContext'
import { NostrStoreProvider } from './context/NostrStoreContext'
import { NostrSubscriptionsProvider } from './context/NostrSubscriptionsContext'
import { GameEventStoreProvider } from './context/GameEventStoreContext'
import { JesterBotProvider } from './context/JesterBotContext'

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

ReactDOM.render(
  <React.StrictMode>
    {/*Using HashRouter for GitHub Pages compatibility */}
    <HashRouter>
      <SettingsProvider value={undefined}>
        <WebsocketProvider value={undefined}>
          <NostrEventsProvider value={undefined}>
            <NostrStoreProvider value={undefined}>
              <GameEventStoreProvider value={undefined}>
                <NostrSubscriptionsProvider value={undefined}>
                  <JesterBotProvider value={undefined}></JesterBotProvider>
                  <App />
                </NostrSubscriptionsProvider>
              </GameEventStoreProvider>
            </NostrStoreProvider>
          </NostrEventsProvider>
        </WebsocketProvider>
      </SettingsProvider>
    </HashRouter>
  </React.StrictMode>,
  document.getElementById('root')
)
