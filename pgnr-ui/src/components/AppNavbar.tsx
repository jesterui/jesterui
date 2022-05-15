import React, { useState, useMemo } from 'react'
import { NavLink as ReactNavLink } from 'react-router-dom'

import { useSettings } from '../context/SettingsContext'

import { RoboHashImg } from '../components/RoboHashImg'
import { WebsocketIndicator } from '../components/WebsocketIndicator'

import * as AppUtils from '../util/app'

// @ts-ignore
import Navbar from '@material-tailwind/react/Navbar'
// @ts-ignore
import NavbarContainer from '@material-tailwind/react/NavbarContainer'
// @ts-ignore
import NavbarWrapper from '@material-tailwind/react/NavbarWrapper'
// @ts-ignore
import NavbarToggler from '@material-tailwind/react/NavbarToggler'
// @ts-ignore
import NavbarCollapse from '@material-tailwind/react/NavbarCollapse'
// @ts-ignore
import Nav from '@material-tailwind/react/Nav'
// @ts-ignore
import NavItem from '@material-tailwind/react/NavItem'
// @ts-ignore
import Icon from '@material-tailwind/react/Icon'

export default function AppNavbar() {
  const settings = useSettings()
  const [openMenu, setOpenMenu] = useState(false)

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const displayPubKey = useMemo(() => publicKeyOrNull && AppUtils.pubKeyDisplayName(publicKeyOrNull), [publicKeyOrNull])

  return (
    <Navbar color="" navbar>
      <NavbarContainer>
        <NavbarWrapper>
          <div className="flex-1 text-sm font-bold inline-block mr-4 whitespace-no-wrap text-white">
            <ReactNavLink to="/" className={({ isActive }) => (isActive ? '' : '')}>
              <div className="grid grid-cols-1">
                <div>
                  jester
                  <span className="ml-1">
                    <WebsocketIndicator />
                  </span>
                  <span
                    style={{ whiteSpace: 'nowrap' }}
                    className="bg-gray-100 text-blue-gray-800 text-xs font-semibold ml-1 px-1 py-0.5 rounded"
                  >
                    beta
                  </span>
                </div>
                <div>
                  {settings.dev ? (
                    <span
                      style={{ whiteSpace: 'nowrap' }}
                      className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded"
                    >
                      dev mode
                    </span>
                  ) : (
                    <span
                      style={{ whiteSpace: 'nowrap' }}
                      className="bg-gray-100 text-blue-gray-800 text-xs font-semibold px-1 py-0.5 rounded"
                    >
                      chess on nostr
                    </span>
                  )}
                </div>
              </div>
            </ReactNavLink>
          </div>
          {publicKeyOrNull && displayPubKey && (
            <div className="flex items-center">
              <ReactNavLink to="/" className={({ isActive }) => `block lg:hidden ${isActive ? '' : ''}`}>
                <RoboHashImg
                  className="w-9 h-9 ml-2 mr-2 rounded-full shadow-sm-gray bg-blue-gray-500"
                  value={publicKeyOrNull}
                  alt={displayPubKey}
                />
              </ReactNavLink>
            </div>
          )}
          <NavbarToggler color="white" onClick={() => setOpenMenu(!openMenu)} ripple="light" />
        </NavbarWrapper>
        <NavbarCollapse open={openMenu}>
          <Nav leftSide className="items-center hidden lg:flex">
            {settings.currentGameJesterId && (
              <ReactNavLink to="/current" className={({ isActive }) => `mx-1 my-1 ${isActive ? '' : ''}`}>
                <NavItem ripple="light">
                  <div className="h-6 w-6 flex justify-center items-center">
                    <Icon name="games" size="xl" />
                  </div>
                  Active Game
                </NavItem>
              </ReactNavLink>
            )}

            <ReactNavLink
              to="/lobby"
              className={({ isActive }) => `mx-1 my-1 ${isActive ? 'bg-white bg-opacity-20 rounded-lg' : ''}`}
            >
              <NavItem ripple="light">
                <div className="h-6 w-6 flex justify-center items-center">
                  <Icon name="language" size="xl" />
                </div>
                Lobby
              </NavItem>
            </ReactNavLink>
          </Nav>
          <Nav className="mt-2 lg:mt-0">
            <ReactNavLink
              to="/search"
              className={({ isActive }) => `mx-1 my-1 ${isActive ? 'bg-white bg-opacity-20 rounded-lg' : ''}`}
            >
              <NavItem ripple="light">
                <div className="h-6 w-6 flex justify-center items-center">
                  <Icon name="search" size="xl" />
                </div>
                <span className="lg:hidden">Search</span>
              </NavItem>
            </ReactNavLink>
            {/*<ReactNavLink
              to="/faq"
              className={({ isActive }) => `mx-1 my-1 ${isActive ? 'bg-white bg-opacity-20 rounded-lg' : ''}`}
            >
              <NavItem ripple="light">
                <div className="w-6 flex justify-center">
                  <Icon name="contact_support" size="xl" />
                </div>
                <span className="lg:hidden">FAQ</span>
              </NavItem>
            </ReactNavLink>*/}
            <ReactNavLink
              to="/settings"
              className={({ isActive }) => `mx-1 my-1 ${isActive ? 'bg-white bg-opacity-20 rounded-lg' : ''}`}
            >
              <NavItem ripple="light">
                <div className="h-6 w-6 flex justify-center items-center">
                  <Icon name="settings" size="xl" />
                </div>
                <span className="lg:hidden">Settings</span>
              </NavItem>
            </ReactNavLink>

            {publicKeyOrNull && displayPubKey && (
              <ReactNavLink to="/" className={({ isActive }) => `hidden lg:block mx-1 my-1 ${isActive ? '' : ''}`}>
                <RoboHashImg
                  className="w-9 h-9 ml-2 mr-2 rounded-full shadow-sm-gray bg-blue-gray-500"
                  value={publicKeyOrNull}
                  alt={displayPubKey}
                />
                <span className="lg:hidden">Profile</span>
              </ReactNavLink>
            )}
            {/*privateKeyOrNull && publicKeyOrNull && (<ReactNavLink
              to="/settings"
              className={({ isActive }) => `lg:hidden mx-1 my-1 ${isActive ? '' : ''}`}
            >
            <NavItem ripple="light">
              <img
                className="w-5 h-5 rounded-full shadow-lg-gray bg-blue-gray-500"
                src={`https://robohash.org/${publicKeyOrNull}`}
                alt={publicKeyOrNull}
              />
                <span className="lg:hidden">Profile</span>
              </NavItem>
            </ReactNavLink>)*/}

            {/*privateKeyOrNull && publicKeyOrNull && (
              <>
                <div className="mx-1 my-1">
                  <Dropdown
                    color="deepOrange"
                    placement="bottom-start"
                    buttonText={displayPubKey}
                    buttonType="filled"
                    size="regular"
                    rounded={false}
                    block={true}
                    ripple="light"
                  >
                    <DropdownItem color="red" ripple="light" onClick={() => deleteIdentityButtonClicked()}>
                      Forget identity
                    </DropdownItem>
                  </Dropdown>
                </div>
              </>
            )*/}
          </Nav>
        </NavbarCollapse>
      </NavbarContainer>
    </Navbar>
  )
}
