import React, { useEffect, useState } from 'react'
import { Route, Routes, Navigate, useParams, useNavigate } from 'react-router-dom'

import NostrLogIncomingRelayEvents from './components/nostr/NostrLogIncomingRelayEvents'
import NostrManageSubscriptions from './components/nostr/NostrManageSubscriptions'
import AppNavbar from './components/AppNavbar'
import Settings from './components/Settings'
import Index from './components/Index'
import Faq from './components/Faq'
import GamesOverview from './components/GamesOverview'
import GameById from './components/GameById'

import Layout from './Layout'

import * as NIP01 from './util/nostr/nip01'
import * as AppUtils from './util/pgnrui'
import './App.css'

// TODO: this whole component is a hack.. generally works, but please try to remove it
function RedirectToGame({ gameId: argGameId }: { gameId?: NIP01.Sha256 | undefined }) {
  const { gameId: paramsGameId } = useParams<{ gameId: NIP01.Sha256 | undefined }>()
  const [gameId] = useState<NIP01.Sha256 | undefined>(argGameId || paramsGameId)

  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/game/${gameId}`)
  }, [navigate, gameId])

  return <>Redirecting to {gameId && AppUtils.gameDisplayNameShort(gameId)}...</>
}

export default function App() {
  return (
    <>
      <>
        <NostrManageSubscriptions />
        <NostrLogIncomingRelayEvents />
      </>
      <div className="App">
        <header className="App-header w-full">
          <AppNavbar />
        </header>
        <section className="App-container">
          <Routes>
            <Route element={<Layout variant={null} />}>
              <Route path="/" element={<Index />} />
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
