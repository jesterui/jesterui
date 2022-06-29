import React, { useMemo } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { useSettings } from './context/SettingsContext'

import NostrLogIncomingRelayEvents from './components/nostr/devel/NostrLogIncomingRelayEvents'
import NostrManageSubscriptions from './components/nostr/NostrManageSubscriptions'
import NoCurrentGamePage from './components/NoCurrentGamePage'
import NostrManageRelays from './components/nostr/NostrManageRelays'
import AppNavbar from './components/AppNavbar'
import SettingsPage from './components/SettingsPage'
import IndexPage from './components/IndexPage'
import FaqPage from './components/FaqPage'
import RedirectToGame from './components/RedirectToGame'
import LobbyPage from './components/LobbyPage'
import GameByIdPage from './components/GameByIdPage'
import Layout from './Layout'

import './App.css'
import SearchPage from './components/SearchPage'

export default function App() {
  const settings = useSettings()
  const currentGameJesterId = useMemo(() => settings.currentGameJesterId, [settings])

  return (
    <>
      <>
        <NostrManageSubscriptions />
        <NostrManageRelays />
        {settings.dev && <NostrLogIncomingRelayEvents />}
      </>
      <a href="https://github.com/jesterui/jesterui" rel="noopener noreferrer">
        <img alt="Fork me on GitHub" title="Fork me on GitHub" src="fork_me.png" id="forkme" />
      </a>
      <div className="App pb-4 min-w-xs">
        <header className="App-header w-full">
          <AppNavbar />
        </header>
        <section className="App-container">
          <Routes>
            <Route element={<Layout variant={null} />}>
              <Route path="/" element={<IndexPage />} />
              <Route
                path="/current"
                element={
                  currentGameJesterId ? (
                    <RedirectToGame jesterId={currentGameJesterId} replace={true} />
                  ) : (
                    <NoCurrentGamePage />
                  )
                }
              />
              {settings.dev && <Route path="/no-current-game" element={<NoCurrentGamePage />} />}
              <Route path="/lobby" element={<LobbyPage />} />
              <Route path="/game/:jesterId" element={<GameByIdPage />} />
              <Route path="/redirect/game/:jesterId" element={<RedirectToGame replace={true} />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/login" element={<Navigate to="/settings" replace={true} />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="*" element={<Navigate to="/" replace={true} />} />
            </Route>
          </Routes>
        </section>
        <footer className="App-footer"></footer>
      </div>
    </>
  )
}
