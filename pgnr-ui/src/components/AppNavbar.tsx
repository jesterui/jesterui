import React, { useState } from 'react'
import { NavLink as ReactNavLink } from 'react-router-dom'
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

import { WebsocketIndicator } from '../components/WebsocketIndicator'

export default function AppNavbar() {
  const [openMenu, setOpenMenu] = useState(false)

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
          <NavbarToggler color="white" onClick={() => setOpenMenu(!openMenu)} ripple="light" />
        </NavbarWrapper>

        <NavbarCollapse open={openMenu}>
          <Nav>
            <ReactNavLink
              to="/current"
              className={({ isActive }) => (isActive ? 'bg-white bg-opacity-20 rounded-lg' : '')}
            >
              <NavItem ripple="light">
                <Icon name="language" size="xl" />
                Game
              </NavItem>
            </ReactNavLink>
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
