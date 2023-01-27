import { useRef } from 'react'
import { Button } from 'react-daisyui'
import { H1 } from './Headings'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'

import { CreateGameAndRedirectButtonHook } from '../components/CreateGameButton'
import { NoConnectionAlert } from '../components/NoConnectionAlert'

export default function NoCurrentGamePage() {
  const incomingNostr = useIncomingNostrEvents()
  const createNewGameButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="screen-current-game">
      <div className="flex justify-center items-center">
        <div className="w-full grid grid-cols-1 lg:w-8/12">
          <H1>It seems you do not have a game running..</H1>
          <div className="flex justify-center items-center">
            {!incomingNostr ? (
              <NoConnectionAlert />
            ) : (
              <>
                <Button color="success" ref={createNewGameButtonRef} className="w-48 h-16">
                  Start A new game
                  <CreateGameAndRedirectButtonHook buttonRef={createNewGameButtonRef} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
