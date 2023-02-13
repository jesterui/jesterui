import { useMemo } from 'react'
import { Route, Routes, Navigate, Outlet } from 'react-router-dom'
import { Theme } from 'react-daisyui'
import { useSettings } from './context/SettingsContext'

import NostrLogIncomingRelayEvents from './components/nostr/devel/NostrLogIncomingRelayEvents'
import NostrManageSubscriptions from './components/nostr/NostrManageSubscriptions'
import NoCurrentGamePage from './components/NoCurrentGamePage'
import NostrManageRelays from './components/nostr/NostrManageRelays'
import SettingsPage from './components/SettingsPage'
import IndexPage from './components/IndexPage'
import FaqPage from './components/FaqPage'
import RedirectToGame from './components/RedirectToGame'
import LobbyPage from './components/LobbyPage'
import GameByIdPage from './components/GameByIdPage'
import SearchPage from './components/SearchPage'
import { Layout } from './Layout'

import ROUTES from './routes'

export default function App() {
  const settings = useSettings()
  const currentGameJesterId = useMemo(() => settings.currentGameJesterId, [settings])

  return (
    <Theme dataTheme={settings.theme || 'dark'}>
      <>
        <NostrManageSubscriptions />
        <NostrManageRelays />
        {settings.dev && <NostrLogIncomingRelayEvents />}
      </>
      <div className="min-w-xs">
        <Routes>
          <Route
            element={
              <Layout title={<span className="font-bold ">jester</span>} drawer={{}}>
                <Outlet />
              </Layout>
            }
          >
            <Route path={ROUTES.home} element={<IndexPage />} />
            <Route
              path={ROUTES.currentGame}
              element={
                currentGameJesterId ? (
                  <RedirectToGame jesterId={currentGameJesterId} replace={true} />
                ) : (
                  <NoCurrentGamePage />
                )
              }
            />
            {settings.dev && <Route path={ROUTES.__noCurrentGame} element={<NoCurrentGamePage />} />}
            <Route path={ROUTES.lobby} element={<LobbyPage />} />
            <Route path="/game/:jesterId" element={<GameByIdPage />} />
            <Route path="/redirect/game/:jesterId" element={<RedirectToGame replace={true} />} />
            <Route path={ROUTES.search} element={<SearchPage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
            <Route path={ROUTES.login} element={<Navigate to={ROUTES.settings} replace={true} />} />
            <Route path={ROUTES.faq} element={<FaqPage />} />
            <Route path="*" element={<Navigate to={ROUTES['*']} replace={true} />} />
          </Route>
        </Routes>
      </div>
    </Theme>
  )
}
