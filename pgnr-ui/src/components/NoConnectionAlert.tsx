import React from 'react'
import { Link } from 'react-router-dom'

// @ts-ignore
import Alert from '@material-tailwind/react/Alert'

export function NoConnectionAlert() {
  return (
    <Link to={`/settings`} className="block flex justify-center my-4">
      <div className="w-full max-w-sm">
        <Alert color="amber">
          <div className="text-gray-800">No connection to nostr : (</div>
        </Alert>
      </div>
    </Link>
  )
}
