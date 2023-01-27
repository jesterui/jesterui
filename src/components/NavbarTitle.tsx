import { ReactNode } from 'react'
import { NavLink as ReactNavLink } from 'react-router-dom'

import { useSettings } from '../context/SettingsContext'
import { WebsocketIndicator } from '../components/WebsocketIndicator'

import ROUTES from '../routes'

type NavbarProps = {
  title: ReactNode
}

export default function NavbarTitle({ title }: NavbarProps) {
  const settings = useSettings()

  return (
    <ReactNavLink to={ROUTES.home} className={({ isActive }) => (isActive ? '' : '')}>
      <div className="grid grid-cols-1 justify-items-center w-24">
        <div className="flex items-center">
          {title}
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
        <div style={{ marginLeft: '-1px' }}>
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
  )
}
