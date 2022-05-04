import React from 'react'
import ReactDOM from 'react-dom'
import { HashRouter } from 'react-router-dom'

import './index.css'
import '@material-tailwind/react/tailwind.css'
import App from './App'
import reportWebVitals from './reportWebVitals'

import { SettingsProvider } from './context/SettingsContext'
import { WebsocketProvider } from './context/WebsocketContext'
import { NostrEventsProvider } from './context/NostrEventsContext'
import { NostrStoreProvider } from './context/NostrStoreContext'
import { NostrSubscriptionsProvider } from './context/NostrSubscriptionsContext'
import { GameEventStoreProvider } from './context/GameEventStoreContext'

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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
