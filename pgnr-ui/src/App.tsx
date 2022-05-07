import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'

import NostrLogIncomingRelayEvents from './components/nostr/devel/NostrLogIncomingRelayEvents'
import NostrManageSubscriptions from './components/nostr/NostrManageSubscriptions'
import AppNavbar from './components/AppNavbar'
import Settings from './components/Settings'
import Index from './components/Index'
import Faq from './components/Faq'
import RedirectToGame from './components/RedirectToGame'
import GamesOverview from './components/GamesOverview'
import GameById from './components/GameById'

import Layout from './Layout'

import './App.css'
import NoCurrentGamePage from './components/NoCurrentGamePage'
import NostrManageRelays from './components/nostr/NostrManageRelays'
import { useSettings } from './context/SettingsContext'

export default function App() {
  const settings = useSettings()

  const currentGameIdOrNull = settings.currentGameId

  return (
    <>
      <>
        <NostrManageSubscriptions />
        <NostrManageRelays />
        {settings.dev && <NostrLogIncomingRelayEvents />}
      </>
      <div className="App pb-4">
        <header className="App-header w-full">
          <AppNavbar />
        </header>
        <section className="App-container">
          <Routes>
            <Route element={<Layout variant={null} />}>
              <Route path="/" element={<Index />} />
              <Route
                path="/current"
                element={currentGameIdOrNull ? <RedirectToGame gameId={currentGameIdOrNull} /> : <NoCurrentGamePage />}
              />
              {settings.dev && <Route path="/no-current-game" element={<NoCurrentGamePage />} />}
              <Route path="/games" element={<GamesOverview />} />
              <Route path="/game/:gameId" element={<GameById />} />
              <Route path="/redirect/game/:gameId" element={<RedirectToGame />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="*" element={<Navigate to="/" replace={true} />} />
            </Route>
          </Routes>
        </section>
        <footer className="App-footer">
          <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </footer>
      </div>
    </>
  )
}
