import React, { useState } from 'react'
import { NavLink as ReactNavLink, useNavigate } from 'react-router-dom'

import { WebsocketIndicator } from '../components/WebsocketIndicator'
import { CreateGameAndRedirectButton } from './CreateGameButton'
import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'
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

  const onLoginButtonClicked = () => {
    navigate(`/settings`)
  }

  return (
    <Navbar color="blueGray" navbar>
      <NavbarContainer>
        <NavbarWrapper>
          <NavbarBrand>
            <ReactNavLink to="/" className={({ isActive }) => (isActive ? '' : '')}>
              jester
              <span className="px-1">
                <WebsocketIndicator />
              </span>
            </ReactNavLink>
          </NavbarBrand>
          {privateKeyOrNull ? (<>
            {!settings.currentGameId && (
              <CreateGameAndRedirectButton className={`bg-white bg-opacity-20 rounded px-3 py-1 mx-1`} />
            )}
          </>) : (<>
            {publicKeyOrNull ? (
            <button className={`bg-white bg-opacity-20 rounded px-3 py-1 mx-1`} onClick={() => onLoginButtonClicked()}>
            Login
          </button>
          ): (<button className={`bg-white bg-opacity-20 rounded px-3 py-1 mx-1`} onClick={() => newIdentityButtonClicked()}>
          New identity
        </button>)}
          </>)}

          <NavbarToggler color="white" onClick={() => setOpenMenu(!openMenu)} ripple="light" />
        </NavbarWrapper>

        <NavbarCollapse open={openMenu}>
            {settings.currentGameId && (<Nav leftSide>
              <ReactNavLink
              to="/current"
              className={({ isActive }) => (isActive ? 'bg-white bg-opacity-20 rounded-lg' : '')}
            >
              <NavItem ripple="light">
                <Icon name="language" size="xl" />
                Game
              </NavItem>
            </ReactNavLink>
            </Nav>)}
          <Nav>
            <ReactNavLink
              to="/games"
              className={({ isActive }) => (isActive ? 'bg-white bg-opacity-20 rounded-lg' : '')}
            >
              <NavItem ripple="light">
                <Icon name="games" size="xl" />
                Games
              </NavItem>
            </ReactNavLink>

            <ReactNavLink to="/faq" className={({ isActive }) => (isActive ? 'bg-white bg-opacity-20 rounded-lg' : '')}>
              <NavItem ripple="light">
                <Icon name="contact_support" size="xl" />
                FAQ
              </NavItem>
            </ReactNavLink>
            <ReactNavLink
              to="/settings"
              className={({ isActive }) => (isActive ? 'bg-white bg-opacity-20 rounded-lg' : '')}
            >
              <NavItem ripple="light">
                <Icon name="settings" size="xl" />
                Settings
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
          </Nav>
        </NavbarCollapse>
      </NavbarContainer>
    </Navbar>
  )
}
