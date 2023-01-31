import { PropsWithChildren, ReactNode, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="p-4 menu w-60 md:w-80 bg-base-100">
      <Menu horizontal={false} className="gap-1">
        <Menu.Title className="mb-2">
          <span>{title}</span>
        </Menu.Title>

        {publicKeyOrNull && displayPubKey && (
          <Menu.Item>
            <Link to={ROUTES.home}>
              <RoboHashImg
                className="w-6 h-6 rounded-full shadow-sm-gray bg-base-300"
                value={publicKeyOrNull}
                alt={displayPubKey}
              />
              Profile
            </Link>
          </Menu.Item>
        )}

        {settings.currentGameJesterId && (
          <Menu.Item>
            <Link to={ROUTES.currentGame}>
              <PuzzlePieceIcon className="w-6 h-6" />
              Active Game
            </Link>
          </Menu.Item>
        )}

        {(settings.currentGameJesterId || (publicKeyOrNull && displayPubKey)) && <Divider />}

        <Menu.Item>
          <Link to={{ pathname: ROUTES.home }}>
            <HomeIcon className="w-6 h-6" />
            Home
          </Link>
        </Menu.Item>

        <Menu.Item>
          <Link to={{ pathname: ROUTES.lobby }}>
            <GlobeAltIcon className="w-6 h-6" />
            Lobby
          </Link>
        </Menu.Item>
        <Menu.Item>
          <Link to={ROUTES.search}>
            <MagnifyingGlassIcon className="w-6 h-6" />
            Search
          </Link>
        </Menu.Item>

        <Menu.Item>
          <Link to={ROUTES.faq}>
            <QuestionMarkCircleIcon className="w-6 h-6" />
            FAQ
          </Link>
        </Menu.Item>

        <Menu.Item>
          <Link to={ROUTES.settings}>
            <WrenchScrewdriverIcon className="w-6 h-6" />
            Settings
          </Link>
        </Menu.Item>
      </Menu>
      <>{children}</>
    </div>
  )
}
