import { PropsWithChildren, ReactNode, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Divider, Menu } from 'react-daisyui'
import {
  HomeIcon,
  PuzzlePieceIcon,
  GlobeAltIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { useSettings } from '../context/SettingsContext'
import { RoboHashImg } from './RoboHashImg'

import * as AppUtils from '../util/app'
import ROUTES from '../routes'

interface SidebarProps {
  title: ReactNode
}

export function Sidebar({ title, children }: PropsWithChildren<SidebarProps>) {
  const settings = useSettings()

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const displayPubKey = useMemo(() => publicKeyOrNull && AppUtils.pubKeyDisplayName(publicKeyOrNull), [publicKeyOrNull])

  return (
    <div className="menu w-80 md:w-80 bg-base-100 h-screen">
      <Menu horizontal={false} className="gap-1">
        <Menu.Title className="mb-2">
          <span>{title}</span>
        </Menu.Title>

        {publicKeyOrNull && displayPubKey && (
          <Menu.Item>
            <NavLink to={ROUTES.home}>
              <RoboHashImg
                className="w-6 h-6 rounded-full shadow-sm-gray bg-base-300"
                value={publicKeyOrNull}
                alt={displayPubKey}
              />
              Profile
            </NavLink>
          </Menu.Item>
        )}

        {settings.currentGameJesterId && (
          <Menu.Item>
            <NavLink to={ROUTES.currentGame}>
              <PuzzlePieceIcon className="w-6 h-6" />
              Active Game
            </NavLink>
          </Menu.Item>
        )}

        {(settings.currentGameJesterId || (publicKeyOrNull && displayPubKey)) && <Divider />}

        <Menu.Item>
          <NavLink to={{ pathname: ROUTES.home }}>
            <HomeIcon className="w-6 h-6" />
            Home
          </NavLink>
        </Menu.Item>

        <Menu.Item>
          <NavLink to={{ pathname: ROUTES.lobby }}>
            <GlobeAltIcon className="w-6 h-6" />
            Lobby
          </NavLink>
        </Menu.Item>
        <Menu.Item>
          <NavLink to={ROUTES.search}>
            <MagnifyingGlassIcon className="w-6 h-6" />
            Search
          </NavLink>
        </Menu.Item>

        <Menu.Item>
          <NavLink to={ROUTES.faq}>
            <QuestionMarkCircleIcon className="w-6 h-6" />
            FAQ
          </NavLink>
        </Menu.Item>

        <Menu.Item>
          <NavLink to={ROUTES.settings}>
            <WrenchScrewdriverIcon className="w-6 h-6" />
            Settings
          </NavLink>
        </Menu.Item>
      </Menu>
      <>{children}</>
    </div>
  )
}
