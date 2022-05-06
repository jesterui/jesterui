import React from 'react'
import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { CreateGameAndRedirectButton } from './CreateGameButton'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'

export default function CurrentGame() {
  const incomingNostr = useIncomingNostrEvents()
  return (
    <div className="screen-current-game">
      {<Heading1 color="blueGray">It seems you do not have a game running..</Heading1>}
      <div className="flex justify-center items-center">
        {!incomingNostr ? (
          <div>No connection to nostr</div>
        ) : (
          <>
            <CreateGameAndRedirectButton className={`bg-white bg-opacity-20 rounded px-5 py-5 mx-1 my-4`} />
          </>
        )}
      </div>
    </div>
  )
}
