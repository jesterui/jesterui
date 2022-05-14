import React, { useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { GenerateRandomIdentityButton } from '../components/IdentityButtons'
import { CreateGameAndRedirectButton } from '../components/CreateGameButton'

// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import LeadText from '@material-tailwind/react/LeadText'

import { Identity, useSettings } from '../context/SettingsContext'
import { getSession } from '../util/session'
import { pubKeyDisplayName } from '../util/app'
import { GameById } from './jester/GameById'
import { Spinner } from './Spinner'
import { CurrentGameCard } from './GameCard'

function CreateIdentityStep() {
  const navigate = useNavigate()

  const generateRandomIdentityButtonRef = useRef<HTMLButtonElement>(null)

  const viewLobbyButtonClicked = () => navigate(`/lobby`)

  return (
    <>
      <div className="flex justify-center">
        <h1 className="text-center text-blue-gray-500 text-6xl font-serif font-bold mt-0 mb-0">
          Hello, fellow chess player.
        </h1>
      </div>
      <div className="flex justify-center text-center">
        <LeadText color="">Wanna start playing immediately? Let's go!</LeadText>
      </div>
      <div className="flex justify-center items-center space-x-4 my-4">
        <Button
          color="deepOrange"
          buttonType="filled"
          size="lg"
          rounded={false}
          block={false}
          iconOnly={false}
          ripple="light"
          ref={generateRandomIdentityButtonRef}
          className="w-48"
        >
          New Identity
          <GenerateRandomIdentityButton buttonRef={generateRandomIdentityButtonRef} />
        </Button>
      </div>

      <div className="flex justify-center items-center space-x-4 my-4">
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

function LoginIdentityStep({ identity }: { identity: Identity }) {
  const navigate = useNavigate()

  const generateRandomIdentityButtonRef = useRef<HTMLButtonElement>(null)

  const loginButtonClicked = () => navigate(`/login`)
  const viewLobbyButtonClicked = () => navigate(`/lobby`)

  return (
    <>
      <div className="flex justify-center">
        <h1 className="text-center text-blue-gray-500 text-6xl font-serif font-bold mt-0 mb-0">
          {`Welcome back, ${pubKeyDisplayName(identity.pubkey)}.`}
        </h1>
      </div>
      <div className="flex justify-center text-center">
        <LeadText color="" className="">
          Since nos2x is not yet supported, provide your private key or simply create a new identity.
        </LeadText>
      </div>
      <div className="flex justify-center items-center space-x-4 my-4">
        <Button
          color="blueGray"
          buttonType="filled"
          size="regular"
          rounded={false}
          block={false}
          iconOnly={false}
          ripple="light"
          className="w-40"
          onClick={loginButtonClicked}
        >
          Login
        </Button>

        <div>or</div>

        <Button
          color="deepOrange"
          buttonType="outline"
          size="regular"
          rounded={false}
          block={false}
          iconOnly={false}
          ripple="light"
          ref={generateRandomIdentityButtonRef}
          className="w-40"
        >
          New Identity
          <GenerateRandomIdentityButton buttonRef={generateRandomIdentityButtonRef} />
        </Button>
      </div>

      <div className="flex justify-center items-center space-x-4 my-4">
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

function IdentityStep({ identity }: { identity: Identity | null }) {
  if (identity === null) {
    return CreateIdentityStep()
  } else {
    return LoginIdentityStep({ identity })
  }
}

function SetupCompleteStep({ identity }: { identity: Identity }) {
  const createNewGameButtonRef = useRef<HTMLButtonElement>(null)
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

      {!settings.currentGameJesterId ? (
        <div className="flex justify-center text-center">
          <LeadText color="">Join another player or start your own game.</LeadText>
        </div>
      ) : (
        <GameById jesterId={settings.currentGameJesterId}>
          {(game) => {
            if (game === undefined) {
              return <Spinner />
            } else if (game === null) {
              return (
                <div className="flex justify-center text-center">
                  <LeadText color="">Join another player or start your own game.</LeadText>
                </div>
              )
            } else {
              return (
                <>
                  <div className="flex justify-center text-center">
                    <LeadText color="">Your current game already started</LeadText>
                  </div>
                  <div className="flex justify-center my-4">
                    <CurrentGameCard game={game} />
                  </div>
                </>
              )
            }
          }}
        </GameById>
      )}

      <div className="my-4">
        <div className="flex justify-center items-center space-x-4 my-4">
          <Button
            color="blueGray"
            buttonType="outline"
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
        <div className="flex justify-center items-center space-x-4 my-1">
          <Button
            color="green"
            buttonType={settings.currentGameJesterId ? 'outline' : 'filled'}
            size="regular"
            rounded={false}
            block={false}
            iconOnly={false}
            ripple="light"
            ref={createNewGameButtonRef}
            className="w-48"
          >
            Start a new game
            <CreateGameAndRedirectButton buttonRef={createNewGameButtonRef} />
          </Button>
        </div>
      </div>
    </>
  )
}

export default function IndexPage() {
  const incomingNostr = useIncomingNostrEvents()
  const settings = useSettings()

  const identity = useMemo(() => settings.identity || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  const showIdentityStep = identity === null || privateKeyOrNull === null

  return (
    <div className="screen-index">
      <div className="flex justify-center items-center">
        <div className="w-full grid grid-cols-1 mt-8">
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
