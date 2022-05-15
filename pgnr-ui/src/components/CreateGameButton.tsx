import React, { RefObject, useEffect, useCallback, useMemo } from 'react'

import { useSettings } from '../context/SettingsContext'
import { useOutgoingNostrEvents } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { getSession } from '../util/session'
import * as JesterUtils from '../util/jester'
import { useNavigate } from 'react-router-dom'

// TODO: extract functionality in a "CreateGameButtonHook" or something..
interface CreateGameButtonProps {
  onGameCreated: (jesterId: JesterUtils.JesterId) => void
  buttonRef?: RefObject<HTMLButtonElement>
  className?: string
  text?: string
}

export default function CreateGameButton({
  buttonRef,
  className,
  onGameCreated,
  text = 'Start new game',
}: CreateGameButtonProps) {
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  const onStartGameButtonClicked = useCallback(async () => {
    // TODO: do not use window.alert..
    if (!outgoingNostr) {
      window.alert('Nostr EventBus not ready..')
      return
    }
    if (!publicKeyOrNull) {
      window.alert('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      window.alert('PrivKey not available..')
      return
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const event = JesterUtils.constructStartGameEvent(publicKey)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))

    onGameCreated(JesterUtils.gameIdToJesterId(signedEvent.id))
  }, [outgoingNostr, publicKeyOrNull, privateKeyOrNull, onGameCreated])

  const onClick = useCallback(() => onStartGameButtonClicked(), [onStartGameButtonClicked])

  useEffect(() => {
    if (!buttonRef) return
    if (!buttonRef.current) return

    buttonRef.current.onclick = (e) => {
      e.preventDefault()
      onClick()
    }
  }, [buttonRef, onClick])

  if (buttonRef) {
    return <></>
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${className || 'bg-white bg-opacity-20 rounded px-2 py-1'}`}
      onClick={onClick}
    >
      {text}
    </button>
  )
}

interface CreateGameAndRedirectButtonProps {
  buttonRef?: RefObject<HTMLButtonElement>
  className?: string
}

export function CreateGameAndRedirectButton({ buttonRef, className }: CreateGameAndRedirectButtonProps) {
  const navigate = useNavigate()

  const onGameCreated = async (jesterId: JesterUtils.JesterId) => {
    // TODO: this is a hack so we do not need to watch for gameId changes..
    // please, please please.. try to remove it and immediately
    // navigate to /game/:gameId
    navigate(`/redirect/game/${jesterId}`)
  }

  return <CreateGameButton buttonRef={buttonRef} className={className} onGameCreated={onGameCreated} />
}

interface GameRedirectButtonHookProps {
  buttonRef: RefObject<HTMLButtonElement>
  jesterId: JesterUtils.JesterId
}

export function GameRedirectButtonHook({ buttonRef, jesterId }: GameRedirectButtonHookProps) {
  const navigate = useNavigate()

  const onClick = useCallback(() => navigate(`/redirect/game/${jesterId}`), [navigate, jesterId])

  useEffect(() => {
    if (!buttonRef) return
    if (!buttonRef.current) return

    buttonRef.current.onclick = (e) => {
      e.preventDefault()
      onClick()
    }
  }, [buttonRef, onClick])

  return <></>
}
