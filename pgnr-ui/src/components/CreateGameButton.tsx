import React, { MouseEvent, RefObject } from 'react'

import { useSettings } from '../context/SettingsContext'
import { useOutgoingNostrEvents } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { getSession } from '../util/session'
import * as AppUtils from '../util/jester'
import { useNavigate } from 'react-router-dom'

interface CreateGameButtonProps {
  onGameCreated: (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.EventId) => void
  buttonRef?: RefObject<HTMLButtonElement>
  className?: string
}

export default function CreateGameButton({ buttonRef, className, onGameCreated }: CreateGameButtonProps) {
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const onStartGameButtonClicked = async (e: MouseEvent<HTMLButtonElement>) => {
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

    const event = AppUtils.constructStartGameEvent(publicKey)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))

    onGameCreated(e, signedEvent.id)
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${className || 'bg-white bg-opacity-20 rounded px-2 py-1'}`}
      onClick={(e: MouseEvent<HTMLButtonElement>) => onStartGameButtonClicked(e)}
    >
      Start new game
    </button>
  )
}
interface CreateGameAndRedirectButtonProps {
  buttonRef?: RefObject<HTMLButtonElement>
  className?: string
}

export function CreateGameAndRedirectButton({ buttonRef, className }: CreateGameAndRedirectButtonProps) {
  const navigate = useNavigate()

  const onGameCreated = async (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.Sha256) => {
    // TODO: this is a hack so we do not need to watch for gameId changes..
    // please, please please.. try to remove it and immediately
    // navigate to /game/:gameId
    navigate(`/redirect/game/${gameId}`)
  }

  return <CreateGameButton buttonRef={buttonRef} className={className} onGameCreated={onGameCreated} />
}
