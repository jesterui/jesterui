import React, { useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { Identity, useSettings } from '../context/SettingsContext'

import { GenerateRandomIdentityButton } from '../components/IdentityButtons'
import { GameById } from '../components/jester/GameById'
import { Spinner } from '../components/Spinner'
import { CurrentGameCard } from '../components/GameCard'
import { NoConnectionAlert } from '../components/NoConnectionAlert'
import { RoboHashImg } from '../components/RoboHashImg'
import {
  CreateDirectChallengeAndRedirectButtonHook,
  CreateGameAndRedirectButtonHook,
} from '../components/CreateGameButton'

import { getSession } from '../util/session'
import { createPersonalBotKeyPair, pubKeyDisplayName } from '../util/app'
import { PubKey } from '../util/nostr/nip01'

// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import LeadText from '@material-tailwind/react/LeadText'

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
  const challengeBotButtonRef = useRef<HTMLButtonElement>(null)

  const settings = useSettings()
  const navigate = useNavigate()

  const displayPubKey = useMemo(() => pubKeyDisplayName(identity.pubkey), [identity])
  const privateKey = getSession()!.privateKey!

  const botPublicKey = useMemo<PubKey>(() => {
    return createPersonalBotKeyPair(privateKey).publicKey
  }, [privateKey])

  const viewLobbyButtonClicked = () => navigate(`/lobby`)

  return (
    <>
      <div className="flex justify-center">
        <RoboHashImg
          className="w-32 h-32 lg:w-48 lg:h-48 mb-2 rounded-full shadow-sm-gray bg-blue-gray-500"
          value={identity.pubkey}
          alt={displayPubKey}
        />
      </div>
      <h1 className="text-center text-blue-gray-500 text-4xl lg:text-6xl font-serif font-bold mb-0">
        {`Hello, ${displayPubKey}.`}
      </h1>

      <GameById jesterId={settings.currentGameJesterId || null}>
        {(game) => {
          if (game === undefined) {
            return <Spinner />
          } else if (game === null) {
            return (
              <>
                <div className="flex justify-center text-center">
                  <LeadText color="">
                    Join another player or start a new game. <br />
                    Also, why not challenge your own personal robot?
                  </LeadText>
                </div>
                <div className="my-4">
                  <div className="flex justify-center items-center space-x-4 my-4">
                    <Button
                      color="teal"
                      buttonType={settings.currentGameJesterId ? 'outline' : 'filled'}
                      size="regular"
                      rounded={false}
                      block={false}
                      iconOnly={false}
                      ripple="light"
                      className="w-48"
                      ref={challengeBotButtonRef}
                    >
                      Challenge robot
                      <CreateDirectChallengeAndRedirectButtonHook
                        buttonRef={challengeBotButtonRef}
                        opponentPubKey={botPublicKey}
                      />
                    </Button>
                  </div>
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
                  <div className="flex justify-center items-center space-x-4 my-4">
                    <Button
                      color="green"
                      buttonType={'outline'}
                      size="regular"
                      rounded={false}
                      block={false}
                      iconOnly={false}
                      ripple="light"
                      className="w-48"
                      ref={createNewGameButtonRef}
                    >
                      Start a new game
                      <CreateGameAndRedirectButtonHook buttonRef={createNewGameButtonRef} />
                    </Button>
                  </div>
                </div>
              </>
            )
          } else {
            return (
              <>
                <div className="flex justify-center text-center">
                  <LeadText color="">Your current game already started</LeadText>
                </div>
                <div className="flex justify-center my-2">
                  <CurrentGameCard game={game} />
                </div>
              </>
            )
          }
        }}
      </GameById>
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
        <div className="w-full grid grid-cols-1">
          {!incomingNostr && <NoConnectionAlert />}
          <div className="mt-2">
            {showIdentityStep ? <IdentityStep identity={identity} /> : <SetupCompleteStep identity={identity} />}
          </div>
        </div>
      </div>
    </div>
  )
}
