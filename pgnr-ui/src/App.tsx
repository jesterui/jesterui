import React, { useEffect, useState } from 'react'
import { Route, Routes, Navigate, useParams, useNavigate } from 'react-router-dom'

import NostrLogIncomingRelayEvents from './components/nostr/NostrLogIncomingRelayEvents'
import AppNavbar from './components/AppNavbar'
import Settings from './components/Settings'
import Index from './components/Index'
import Faq from './components/Faq'
import GamesOverview from './components/GamesOverview'
import GameById from './components/GameById'
import Layout from './Layout'

import { useSettings, Subscription } from './context/SettingsContext'
import { useOutgoingNostrEvents } from './context/NostrEventsContext'
import * as NIP01 from './util/nostr/nip01'
import * as AppUtils from './util/pgnrui'
import { arrayEquals } from './util/utils'
import './App.css'

function NostrManageSubscriptions() {
  const settings = useSettings()
  const outgoingNostr = useOutgoingNostrEvents()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [closeSubscriptions, setCloseSubscriptions] = useState<Subscription[]>([])

  useEffect(() => {
    if (!outgoingNostr) return
    if (closeSubscriptions.length === 0) return

    const abortCtrl = new AbortController()

    closeSubscriptions.forEach((sub) => {
      outgoingNostr.emit('CLOSE', NIP01.createClientCloseMessage(sub.id))
    })

    setCloseSubscriptions([])
    return () => abortCtrl.abort()
  }, [closeSubscriptions, outgoingNostr])

  useEffect(() => {
    if (!outgoingNostr) return
    if (subscriptions.length === 0) return

    const abortCtrl = new AbortController()

    subscriptions.forEach((sub) => {
      outgoingNostr.emit('REQ', NIP01.createClientReqMessage(sub.id, sub.filters))
    })

    return () => abortCtrl.abort()
  }, [outgoingNostr, subscriptions])

  // initialize subscriptons based on settings
  useEffect(() => {
    const subscriptionsFromSettings = settings.subscriptions || []
    const resubscribe = !arrayEquals(subscriptions, subscriptionsFromSettings)

    if (resubscribe) {
      console.log('[Nostr] Will resubscribe..', subscriptionsFromSettings)
      setSubscriptions((currentSubs) => {
        const newSubs = [...subscriptionsFromSettings]
        const newSubsIds = newSubs.map((s) => s.id)
        const closeSubs = currentSubs.filter((val) => !newSubsIds.includes(val.id))

        setCloseSubscriptions(closeSubs)

        return newSubs
      })
    }
  }, [subscriptions, settings])

  return <></>
}

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
