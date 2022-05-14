import React, { useRef } from 'react'
import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { CreateGameAndRedirectButton } from './CreateGameButton'
import { NoConnectionAlert } from './NoConnectionAlert'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Button from '@material-tailwind/react/Button'

export default function NoCurrentGamePage() {
  const incomingNostr = useIncomingNostrEvents()
  const createNewGameButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="screen-current-game">
      {<Heading1 color="blueGray">It seems you do not have a game running..</Heading1>}
      <div className="flex justify-center items-center">
        {!incomingNostr ? (
          <NoConnectionAlert />
        ) : (
          <>
            <Button
              color="green"
              buttonType="filled"
              size="regular"
              rounded={false}
              block={false}
              iconOnly={false}
              ripple="light"
              ref={createNewGameButtonRef}
              className="w-48 h-16"
            >
              Start A new game
              <CreateGameAndRedirectButton buttonRef={createNewGameButtonRef} />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
