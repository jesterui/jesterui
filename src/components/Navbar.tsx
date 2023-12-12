import { ReactNode, useMemo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  PuzzlePieceIcon,
  GlobeAltIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { Navbar as DaisyNavbar, Button, Menu } from 'react-daisyui'

import NavbarTitle from './NavbarTitle'
import { RoboHashImg } from './RoboHashImg'
import { useSettings } from '../context/SettingsContext'
import * as AppUtils from '../util/app'
import ROUTES from '../routes'

type NavbarProps = {
  title: ReactNode
  toggleSidebar: () => void
}

export function Navbar({ title, toggleSidebar }: NavbarProps) {
  const settings = useSettings()

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const displayPubKey = useMemo(() => publicKeyOrNull && AppUtils.pubKeyDisplayName(publicKeyOrNull), [publicKeyOrNull])

  return (
    <DaisyNavbar className="w-auto gap-2 shadow-xl border border-base-content/20 rounded-box m-2 mb-6">
      <DaisyNavbar.Start className="ml-2">
        <div className="flex-none md:hidden">
          <Button shape="square" color="ghost" onClick={toggleSidebar}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-6 h-6 stroke-current"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
        <div className="flex-1 hidden md:block">
          <NavbarTitle title={title} />
        </div>
      </DaisyNavbar.Start>
      <DaisyNavbar.Center className="flex-none md:hidden">
        <NavbarTitle title={title} />
      </DaisyNavbar.Center>
      <DaisyNavbar.End>
        <div className="flex-none md:hidden">
          <Menu horizontal={true} className="gap-1">
            {settings.currentGameJesterId && (
              <Menu.Item>
                <NavLink to={ROUTES.currentGame} className="rounded-lg" title="Active Game">
                  <PuzzlePieceIcon className="w-6 h-6" />
                  <span className="hidden">Active Game</span>
                </NavLink>
              </Menu.Item>
            )}
          </Menu>
        </div>
        <div className="flex-none hidden md:block">
          <Menu horizontal={true} className="gap-1 p-0 items-center">
            {settings.currentGameJesterId && (
              <Menu.Item>
                <NavLink to={ROUTES.currentGame} className="rounded-lg" title="Active Game">
                  <PuzzlePieceIcon className="w-6 h-6" />
                  Active Game
                </NavLink>
              </Menu.Item>
            )}

            <Menu.Item>
              <NavLink to={ROUTES.lobby} className="rounded-lg" title="Lobby">
                <GlobeAltIcon className="w-6 h-6" />
                Lobby
              </NavLink>
            </Menu.Item>
            <Menu.Item>
              <NavLink to={ROUTES.search} className="rounded-lg" title="Search">
                <MagnifyingGlassIcon className="w-6 h-6" />
                <span className="hidden">Search</span>
              </NavLink>
            </Menu.Item>
            <Menu.Item>
              <NavLink to={ROUTES.faq} className="rounded-lg" title="FAQ">
                <QuestionMarkCircleIcon className="w-6 h-6" />
                <span className="hidden">FAQ</span>
              </NavLink>
            </Menu.Item>
            <Menu.Item>
              <NavLink to={ROUTES.settings} className="rounded-lg" title="Settings">
                <WrenchScrewdriverIcon className="w-6 h-6" />
                <span className="hidden">Settings</span>
              </NavLink>
            </Menu.Item>

            {publicKeyOrNull && displayPubKey && (
              <Menu.Item>
                <Link to={ROUTES.home} className="p-2 m-0 rounded-lg" title="Profile">
                  <RoboHashImg
                    className="h-8 w-8 rounded-full shadow-sm-gray bg-base-300"
                    value={publicKeyOrNull}
                    alt={displayPubKey}
                  />
                  <span className="hidden">Profile</span>
                </Link>
              </Menu.Item>
            )}
          </Menu>
        </div>
      </DaisyNavbar.End>
    </DaisyNavbar>
  )
}
