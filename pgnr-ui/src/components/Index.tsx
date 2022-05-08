import React, { MouseEvent, ChangeEvent, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { GenerateRandomIdentityButton } from '../components/IdentityButtons'
import { CreateGameAndRedirectButton, CurrentGameRedirectButtonHook } from '../components/CreateGameButton'

// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import LeadText from '@material-tailwind/react/LeadText'

import { Identity, useSettings } from '../context/SettingsContext'
import { getSession } from '../util/session'
import { pubKeyDisplayName } from '../util/app'

function CreateIdentityStep() {
  const generateRandomIdentityButtonRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <div className="flex justify-center">
        <h1 className="text-center text-blue-gray-500 text-6xl font-serif font-bold mt-0 mb-0">
          Hello, fellow chess player.
        </h1>
      </div>
      <div className="flex justify-center">
        <LeadText color="">Wanna start playing immediately? Let's go!</LeadText>
      </div>
      <div className="flex justify-center">
        <Button
          color="deepOrange"
          buttonType="filled"
          size="regular"
          rounded={false}
          block={false}
          iconOnly={false}
          ripple="light"
          ref={generateRandomIdentityButtonRef}
        >
          New Identity
          <GenerateRandomIdentityButton buttonRef={generateRandomIdentityButtonRef} />
        </Button>
      </div>
    </>
  )
}

function LoginIdentityStep({ identity }: { identity: Identity }) {
  return (
    <>
      <div className="flex justify-center">
        <h1 className="text-center text-blue-gray-500 text-6xl font-serif font-bold mt-0 mb-0">
          {`Welcome back, ${pubKeyDisplayName(identity.pubkey)}.`}
        </h1>
      </div>
    </>
  )
}

function IdentityStep({ identity }: { identity: Identity | null }) {
  if (identity === null) {
    return CreateIdentityStep()
  } else {
    return LoginIdentityStep({ identity })
  }
}

function SetupCompleteStep({ identity }: { identity: Identity }) {
  const createNewGameButtonRef = useRef<HTMLButtonElement>(null)
  const redirectToCurrentGameButtonRef = useRef<HTMLButtonElement>(null)
  const settings = useSettings()
  const navigate = useNavigate()

  const viewLobbyButtonClicked = () => navigate(`/lobby`)

  return (
    <>
      <div className="flex justify-center">
        <h1 className="text-center text-blue-gray-500 text-6xl font-serif font-bold mt-0 mb-0">
          {`Hello, ${pubKeyDisplayName(identity.pubkey)}.`}
        </h1>
      </div>
      <div className="flex justify-center">
        <LeadText color="">Join another player or start your own game.</LeadText>
      </div>
      <div className="flex justify-center items-center space-x-4 my-4">
        {settings.currentGameJesterId && (
          <>
            <Button
              color="green"
              buttonType="filled"
              size="regular"
              rounded={false}
              block={false}
              iconOnly={false}
              ripple="dark"
              ref={redirectToCurrentGameButtonRef}
              disabled={!settings.currentGameJesterId}
              className="w-32"
            >
              Keep playing
              <CurrentGameRedirectButtonHook
                buttonRef={redirectToCurrentGameButtonRef}
                jesterId={settings.currentGameJesterId}
              />
            </Button>

            <div>or</div>
          </>
        )}

        <Button
          color="green"
          buttonType={settings.currentGameJesterId ? 'outline' : 'filled'}
          size="regular"
          rounded={false}
          block={false}
          iconOnly={false}
          ripple="light"
          ref={createNewGameButtonRef}
          className={settings.currentGameJesterId ? 'w-32' : 'w-48'}
        >
          Start a new game
          <CreateGameAndRedirectButton buttonRef={createNewGameButtonRef} />
        </Button>
      </div>
      <div className="flex justify-center items-center space-x-4 my-1">
        <Button
          color="blueGray"
          buttonType="link"
          size="regular"
          rounded={false}
          block={false}
          iconOnly={false}
          ripple="light"
          className="w-48"
          onClick={viewLobbyButtonClicked}
        >
          Browse all games
        </Button>
      </div>
    </>
  )
}

export default function Index() {
  const incomingNostr = useIncomingNostrEvents()
  const settings = useSettings()

  const identity = settings.identity || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const showIdentityStep = identity === null || privateKeyOrNull === null

  return (
    <div className="screen-index">
      <div className="flex justify-center items-center">
        <div className="w-full grid grid-cols-1 mt-16">
          {!incomingNostr && (
            <div className="flex justify-center my-4">
              <div>No connection to nostr</div>
            </div>
          )}
          {showIdentityStep ? <IdentityStep identity={identity} /> : <SetupCompleteStep identity={identity} />}
        </div>
      </div>
    </div>
  )
}
