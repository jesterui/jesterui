import React, { useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { Identity, useSettings } from '../context/SettingsContext'

import { GenerateRandomIdentityButton } from '../components/IdentityButtons'
import { GameById } from '../components/jester/GameById'
import { Spinner } from '../components/Spinner'
import { CurrentGameCard } from '../components/GameCard'
import { NoConnectionAlert } from '../components/NoConnectionAlert'
import { RoboHashImgWithLoader } from '../components/RoboHashImg'
import {
  CreateDirectChallengeAndRedirectButtonHook,
  CreateGameAndRedirectButtonHook,
} from '../components/CreateGameButton'

import { useSetWindowTitle } from '../hooks/WindowTitle'

import { getSession } from '../util/session'
import { createPersonalBotKeyPair, pubKeyDisplayName } from '../util/app'
import { PubKey } from '../util/nostr/nip01'

// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import LeadText from '@material-tailwind/react/LeadText'
// @ts-ignore
//import Popover from '@material-tailwind/react/Popover'
// @ts-ignore
//import PopoverContainer from '@material-tailwind/react/PopoverContainer'
// @ts-ignore
//import PopoverHeader from '@material-tailwind/react/PopoverHeader'
// @ts-ignore
//import PopoverBody from '@material-tailwind/react/PopoverBody'

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
        <LeadText color="white">
          <span className="font-bold">Wanna start playing immediately? Let's go!</span>
        </LeadText>
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
  const displayPubKey = useMemo(() => pubKeyDisplayName(identity.pubkey), [identity])

  const generateRandomIdentityButtonRef = useRef<HTMLButtonElement>(null)

  const loginButtonClicked = () => navigate(`/login`)
  const viewLobbyButtonClicked = () => navigate(`/lobby`)

  return (
    <>
      <div className="flex justify-center">
        <RoboHashImgWithLoader
          className="w-32 h-32 lg:w-48 lg:h-48 mb-2 rounded-full shadow-sm-gray bg-blue-gray-500"
          value={identity.pubkey}
          alt={displayPubKey}
        />
      </div>
      <h1 className="text-center text-blue-gray-500 text-4xl lg:text-6xl font-serif font-bold mb-0">
        {`Welcome back, ${pubKeyDisplayName(identity.pubkey)}.`}
      </h1>
      <div className="flex justify-center text-center">
        <LeadText color="white">
          <span className="font-bold">
            Since nos2x is not yet supported, provide your private key or simply create a new identity.
          </span>
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
  const challengePersonalRobotButtonRef = useRef<HTMLButtonElement>(null)
  // const challengeJesterButtonRef = useRef<HTMLButtonElement>(null)

  const settings = useSettings()
  const navigate = useNavigate()

  const displayPubKey = useMemo(() => pubKeyDisplayName(identity.pubkey), [identity])
  const privateKey = getSession()!.privateKey!

  const personalRobotPublicKey = useMemo<PubKey>(() => {
    return createPersonalBotKeyPair(privateKey).publicKey
  }, [privateKey])

  const viewLobbyButtonClicked = () => navigate(`/lobby`)

  return (
    <>
      <div className="grid grid-cols-1 justify-center justify-items-center content-center">
        <RoboHashImgWithLoader
          className="w-32 h-32 lg:w-48 lg:h-48 mb-2 rounded-full shadow-sm-gray bg-blue-gray-500 grid"
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
                  <div className="w-full max-w-sm sm:w-full">
                    <LeadText color="white">
                      <span className="font-bold">Are you ready?</span>
                    </LeadText>
                  </div>
                </div>
                <div className="grid grid-cols-1 justify-items-center space-y-4">
                  {/*
                    <>
                      <Button
                        color="gray"
                        buttonType="link"
                        size="lg"
                        rounded={false}
                        block={false}
                        iconOnly={false}
                        ripple="light"
                        className="w-full max-w-sm"
                        ref={challengeJesterButtonRef}
                      >
                        Challenge Jester
                      </Button>

                      <Popover placement="top" ref={challengeJesterButtonRef} trigger={'hover'}>
                        <PopoverContainer style={{ position: 'absolute', margin: '0 auto' }}>
                          <PopoverHeader>Challenge declined.</PopoverHeader>
                          <PopoverBody>
                            <figure>
                              <blockquote cite="https://www.example.com">
                                <p>
                                  "It's an entire world of 64 squares. I will dominate it and crush my opponent’s mind."
                                </p>
                              </blockquote>
                              <figcaption>—Jester</figcaption>
                            </figure>
                            <p className="mt-2">Jester laughs and declines your challenge. You are not ready yet.</p>
                          </PopoverBody>
                        </PopoverContainer>
                      </Popover>
                    </>
                  */}
                  <Button
                    color="teal"
                    buttonType="filled"
                    size="lg"
                    rounded={false}
                    block={false}
                    iconOnly={false}
                    ripple="light"
                    className="w-full max-w-sm"
                    ref={challengePersonalRobotButtonRef}
                  >
                    Challenge your robot
                    <CreateDirectChallengeAndRedirectButtonHook
                      buttonRef={challengePersonalRobotButtonRef}
                      opponentPubKey={personalRobotPublicKey}
                    />
                  </Button>
                </div>

                <div className="flex justify-center text-center">
                  <div className="w-full max-w-sm sm:w-full">
                    <LeadText color="white">
                      <span className="font-bold">…or practice with another human.</span>
                    </LeadText>
                  </div>
                </div>
                <div className="grid grid-cols-1 justify-items-center space-y-4">
                  <Button
                    color="blueGray"
                    buttonType="outline"
                    size="lg"
                    rounded={false}
                    block={false}
                    iconOnly={false}
                    ripple="light"
                    className="w-full max-w-sm"
                    onClick={viewLobbyButtonClicked}
                  >
                    Browse all games
                  </Button>
                  <Button
                    color="green"
                    buttonType={'outline'}
                    size="lg"
                    rounded={false}
                    block={false}
                    iconOnly={false}
                    ripple="light"
                    className="w-full max-w-sm"
                    ref={createNewGameButtonRef}
                  >
                    Start a new game
                    <CreateGameAndRedirectButtonHook buttonRef={createNewGameButtonRef} />
                  </Button>
                </div>
              </>
            )
          } else {
            return (
              <>
                <div className="flex justify-center text-center">
                  <LeadText color="white">
                    <span className="font-bold">Game is running…</span>
                  </LeadText>
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
  useSetWindowTitle({ text: 'chess over nostr' })

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
