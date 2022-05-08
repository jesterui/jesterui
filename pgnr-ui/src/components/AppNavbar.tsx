import React, { useState } from 'react'
import { NavLink as ReactNavLink, useNavigate } from 'react-router-dom'

import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'

import { WebsocketIndicator } from '../components/WebsocketIndicator'

import { pubKeyDisplayName } from '../util/app'
import { getSession, setSessionAttribute } from '../util/session'
import * as NostrIdentity from '../util/nostr/identity'

// @ts-ignore
import Navbar from '@material-tailwind/react/Navbar'
// @ts-ignore
import NavbarContainer from '@material-tailwind/react/NavbarContainer'
// @ts-ignore
import NavbarWrapper from '@material-tailwind/react/NavbarWrapper'
// @ts-ignore
import NavbarBrand from '@material-tailwind/react/NavbarBrand'
// @ts-ignore
import NavbarToggler from '@material-tailwind/react/NavbarToggler'
// @ts-ignore
import NavbarCollapse from '@material-tailwind/react/NavbarCollapse'
// @ts-ignore
import Nav from '@material-tailwind/react/Nav'
// @ts-ignore
import NavItem from '@material-tailwind/react/NavItem'
// @ts-ignore
import Dropdown from '@material-tailwind/react/Dropdown'
// @ts-ignore
import DropdownItem from '@material-tailwind/react/DropdownItem'
// @ts-ignore
import Icon from '@material-tailwind/react/Icon'

export default function AppNavbar() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const navigate = useNavigate()
  const [openMenu, setOpenMenu] = useState(false)

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const newIdentityButtonClicked = () => {
    const privateKey = NostrIdentity.generatePrivateKey()
    const publicKey = NostrIdentity.publicKey(privateKey)

    setSessionAttribute({ privateKey })
    settingsDispatch({ identity: { pubkey: publicKey } } as AppSettings)
  }

  const deleteIdentityButtonClicked = () => {
    setSessionAttribute({ privateKey: null })
    settingsDispatch({ identity: undefined } as AppSettings)
  }

  const onLoginButtonClicked = () => {
    navigate(`/settings`)
  }

  /*const onProfileButtonClicked = () => {
    navigate(`/profile`)
  }*/

  return (
    <Navbar color="" navbar>
      <NavbarContainer>
        <NavbarWrapper>
          <NavbarBrand>
            <ReactNavLink to="/" className={({ isActive }) => (isActive ? '' : '')}>
              jester
            </ReactNavLink>
            <span className="px-1">
              <WebsocketIndicator />
            </span>
            {settings.dev && (
              <span
                style={{ whiteSpace: 'nowrap' }}
                className="bg-green-100 text-green-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-green-200 dark:text-green-900"
              >
                dev mode
              </span>
            )}
          </NavbarBrand>
          {!privateKeyOrNull && (
            <>
              {publicKeyOrNull && (
                <button
                  className={`bg-white bg-opacity-20 rounded px-3 py-1 mx-1`}
                  onClick={() => onLoginButtonClicked()}
                >
                  Login
                </button>
              )}
            </>
          )}
          <NavbarToggler color="white" onClick={() => setOpenMenu(!openMenu)} ripple="light" />
        </NavbarWrapper>

        <NavbarCollapse open={openMenu}>
          <Nav leftSide>
            {settings.currentGameJesterId && (
              <ReactNavLink to="/current" className={({ isActive }) => (isActive ? '' : '')}>
                <NavItem ripple="light">
                  <Icon name="language" size="xl" />
                  Current Game
                </NavItem>
              </ReactNavLink>
            )}

            <ReactNavLink
              to="/lobby"
              className={({ isActive }) => `mx-1 my-1 ${isActive ? 'bg-white bg-opacity-20 rounded-lg' : ''}`}
            >
              <NavItem ripple="light">
                <Icon name="games" size="xl" />
                Lobby
              </NavItem>
            </ReactNavLink>
          </Nav>
          <Nav>
            <ReactNavLink
              to="/search"
              className={({ isActive }) => `mx-1 my-1 ${isActive ? 'bg-white bg-opacity-20 rounded-lg' : ''}`}
            >
              <NavItem ripple="light">
                <Icon name="search" size="xl" />
                <span className="lg:hidden">Search</span>
              </NavItem>
            </ReactNavLink>
            <ReactNavLink to="/faq" className={({ isActive }) => (isActive ? 'bg-white bg-opacity-20 rounded-lg' : '')}>
              <NavItem ripple="light">
                <Icon name="contact_support" size="xl" />
                <span className="lg:hidden">FAQ</span>
              </NavItem>
            </ReactNavLink>
            <ReactNavLink
              to="/settings"
              className={({ isActive }) => `mx-1 my-1 ${isActive ? 'bg-white bg-opacity-20 rounded-lg' : ''}`}
            >
              <NavItem ripple="light">
                <Icon name="settings" size="xl" />
                <span className="lg:hidden">Settings</span>
              </NavItem>
            </ReactNavLink>
            {/*<ReactNavLink
              to="/profile"
              className={({ isActive }) => (isActive ? 'bg-white bg-opacity-20 rounded-lg' : '')}
            >
              <NavItem ripple="light">
                <Icon name="account_circle" size="xl" />
                Profile
              </NavItem>
            </ReactNavLink>*/}

            {privateKeyOrNull && publicKeyOrNull && (
              <div className="mx-1 my-1">
                <Dropdown
                  color="deepOrange"
                  placement="bottom-start"
                  buttonText={pubKeyDisplayName(publicKeyOrNull)}
                  buttonType="filled"
                  size="regular"
                  rounded={false}
                  block={true}
                  ripple="light"
                >
                  {/*<DropdownItem color="blueGray" ripple="light" onClick={() => onProfileButtonClicked()}>
            Profile
            </DropdownItem>*/}
                  <DropdownItem color="blueGray" ripple="light" onClick={() => newIdentityButtonClicked()}>
                    Create new identity
                  </DropdownItem>
                  <DropdownItem color="red" ripple="light" onClick={() => deleteIdentityButtonClicked()}>
                    Forget identity
                  </DropdownItem>
                </Dropdown>
              </div>
            )}
          </Nav>
        </NavbarCollapse>
      </NavbarContainer>
    </Navbar>
  )
}
