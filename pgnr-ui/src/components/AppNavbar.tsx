import React, { useState, useMemo } from 'react'
import { NavLink as ReactNavLink } from 'react-router-dom'

import { AppSettings, useSettings, useSettingsDispatch } from '../context/SettingsContext'

import { WebsocketIndicator } from '../components/WebsocketIndicator'

import * as AppUtils from '../util/app'
import { getSession, setSessionAttribute } from '../util/session'

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
import { RoboHashImg } from './RoboHashImg'

export default function AppNavbar() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const [openMenu, setOpenMenu] = useState(false)

  const privateKeyOrNull = getSession()?.privateKey || null
  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const displayPubKey = useMemo(() => publicKeyOrNull && AppUtils.pubKeyDisplayName(publicKeyOrNull), [publicKeyOrNull])

  const deleteIdentityButtonClicked = () => {
    setSessionAttribute({ privateKey: null })
    settingsDispatch({ identity: undefined } as AppSettings)
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
              <span
                style={{ whiteSpace: 'nowrap' }}
                className="bg-gray-100 text-blue-gray-800 text-xs font-semibold ml-1 px-1 py-0.5 rounded dark:bg-green-200 dark:text-green-900"
              >
                beta
              </span>
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
          <NavbarToggler color="white" onClick={() => setOpenMenu(!openMenu)} ripple="light" />
        </NavbarWrapper>
        <NavbarCollapse open={openMenu}>
          <Nav leftSide>
            {settings.currentGameJesterId && (
              <ReactNavLink to="/current" className={({ isActive }) => `mx-1 my-1 ${isActive ? '' : ''}`}>
                <NavItem ripple="light">
                  <div className="w-6 flex justify-center">
                    <Icon name="language" size="xl" />
                  </div>
                  Current Game
                </NavItem>
              </ReactNavLink>
            )}

            <ReactNavLink
              to="/lobby"
              className={({ isActive }) => `mx-1 my-1 ${isActive ? 'bg-white bg-opacity-20 rounded-lg' : ''}`}
            >
              <NavItem ripple="light">
                <div className="w-6 flex justify-center">
                  <Icon name="games" size="xl" />
                </div>
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
                <div className="w-6 flex justify-center">
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
                <div className="w-6 flex justify-center">
                  <Icon name="settings" size="xl" />
                </div>
                <span className="lg:hidden">Settings</span>
              </NavItem>
            </ReactNavLink>

            {privateKeyOrNull && publicKeyOrNull && displayPubKey && (
              <ReactNavLink to="/" className={({ isActive }) => `hidden lg:block mx-1 my-1 ${isActive ? '' : ''}`}>
                <RoboHashImg
                  className="w-6 h-6 ml-2 mr-2 rounded-full shadow-lg-gray bg-blue-gray-500"
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

            {privateKeyOrNull && publicKeyOrNull && (
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
                    {/*<DropdownItem color="blueGray" ripple="light" onClick={() => onProfileButtonClicked()}>
            Profile
            </DropdownItem>*/}
                    <DropdownItem color="red" ripple="light" onClick={() => deleteIdentityButtonClicked()}>
                      Forget identity
                    </DropdownItem>
                  </Dropdown>
                </div>
              </>
            )}
          </Nav>
        </NavbarCollapse>
      </NavbarContainer>
    </Navbar>
  )
}
