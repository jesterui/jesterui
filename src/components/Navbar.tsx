import { ReactNode, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
    <DaisyNavbar className="w-auto shadow-xl gap-2 border rounded-box m-2 mb-6">
      <DaisyNavbar.Start>
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
          <span data-testid="sidebar-title-md">
            <NavbarTitle title={title} />
          </span>
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
                <Link to={ROUTES.currentGame} className="rounded-lg" title="Active Game">
                  <PuzzlePieceIcon className="w-6 h-6" />
                  <span className="hidden">Active Game</span>
                </Link>
              </Menu.Item>
            )}
          </Menu>
        </div>
        <div className="flex-none hidden md:block">
          <Menu horizontal={true} className="gap-1">
            {settings.currentGameJesterId && (
              <Menu.Item>
                <Link to={ROUTES.currentGame} className="rounded-lg" title="Active Game">
                  <PuzzlePieceIcon className="w-6 h-6" />
                  Active Game
                </Link>
              </Menu.Item>
            )}

            <Menu.Item>
              <Link to={ROUTES.lobby} className="rounded-lg" title="Lobby">
                <GlobeAltIcon className="w-6 h-6" />
                Lobby
              </Link>
            </Menu.Item>
            <Menu.Item>
              <Link to={ROUTES.search} className="rounded-lg" title="Search">
                <MagnifyingGlassIcon className="w-6 h-6" />
                <span className="hidden">Search</span>
              </Link>
            </Menu.Item>
            <Menu.Item>
              <Link to={ROUTES.faq} className="rounded-lg" title="FAQ">
                <QuestionMarkCircleIcon className="w-6 h-6" />
                <span className="hidden">FAQ</span>
              </Link>
            </Menu.Item>
            <Menu.Item>
              <Link to={ROUTES.settings} className="rounded-lg" title="Settings">
                <WrenchScrewdriverIcon className="w-6 h-6" />
                <span className="hidden">Settings</span>
              </Link>
            </Menu.Item>

            {publicKeyOrNull && displayPubKey && (
              <Menu.Item>
                <Link to={ROUTES.home} className="p-2 m-0 rounded-lg" title="Profile">
                  <RoboHashImg
                    className="w-9 h-9 rounded-full shadow-sm-gray bg-blue-gray-500"
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

/*
export function Sidebar({ elementId, title }: SidebarProps) {
  const [visible, setVisible] = useState(false)

  const toggleVisible = () => setVisible((current) => !current)

  return (
    <Drawer
      side={true}
      open={visible}
      onClickOverlay={toggleVisible}
      className="font-sans"
    ><>
      <Navbar>
        <div className="flex-none lg:hidden">
          <Button shape="square" color="ghost" onClick={toggleVisible}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-6 h-6 stroke-current"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        </div>
        <div className="flex-1 px-2 mx-2">Navbar Title</div>
        <div className="flex-none hidden lg:block">
          <Menu horizontal={true}>
            <Menu.Item>
              <a>Navbar Item 1</a>
            </Menu.Item>
            <Menu.Item>
              <a>Navbar Item 2</a>
            </Menu.Item>
          </Menu>
        </div>
      </Navbar>
      </>
    </Drawer>)
}*/
/*
  return (
    <div
      id={elementId}
      className="absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out"
    >
      <FbSidebar>
        <FbSidebar.Logo href="#" img="favicon.ico" imgAlt="">
          <span data-testid="sidebar-title">{title}</span>
        </FbSidebar.Logo>
        <FbSidebar.Items>
          <FbSidebar.ItemGroup>
            <Link to={{ pathname: ROUTES.home }}>
              <FbSidebar.Item as={'span'} icon={HomeIcon}>
                Home
              </FbSidebar.Item>
            </Link>
          </FbSidebar.ItemGroup>
          <FbSidebar.ItemGroup>
            <Link to={ROUTES.settings}>
              <FbSidebar.Item as={'span'} icon={WrenchScrewdriverIcon}>
                Settings
              </FbSidebar.Item>
            </Link>
            <Link to={ROUTES.about}>
              <FbSidebar.Item as={'span'} icon={InformationCircleIcon}>
                About
              </FbSidebar.Item>
            </Link>
          </FbSidebar.ItemGroup>
        </FbSidebar.Items>
      </FbSidebar>
    </div>
  )
}*/
