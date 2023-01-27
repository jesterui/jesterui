import { Link } from 'react-router-dom'
import { Alert } from 'react-daisyui'

import ROUTES from '../routes'

export function NoConnectionAlert() {
  return (
    <Link to={ROUTES.settings} className="block flex justify-center my-4">
      <div className="w-full max-w-sm">
        <Alert status="warning">No connection to nostr : (</Alert>
      </div>
    </Link>
  )
}
