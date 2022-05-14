import React from 'react'

// @ts-ignore
import Alert from '@material-tailwind/react/Alert'
import { Link } from 'react-router-dom'

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
