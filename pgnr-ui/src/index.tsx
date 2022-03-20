import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import '@material-tailwind/react/tailwind.css'
import App from './App'
import reportWebVitals from './reportWebVitals'

import { SettingsProvider } from './context/SettingsContext'
import { GamesProvider } from './context/GamesContext'

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
    <BrowserRouter>
      <SettingsProvider value={undefined}>
        <GamesProvider value={undefined}>
          <App />
        </GamesProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
