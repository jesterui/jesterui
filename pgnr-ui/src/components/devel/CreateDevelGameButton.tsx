import React, { MouseEvent } from 'react'

import { useSettings } from '../../context/SettingsContext'
import { useOutgoingNostrEvents } from '../../context/NostrEventsContext'
import * as NIP01 from '../../util/nostr/nip01'
import { getSession } from '../../util/session'
import { createDevelGameEvents } from '../../util/devel'

interface CreateDevelGameButtonProps {
  onGameCreated: (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.Sha256) => void
  className?: string
}

export default function CreateDevelGameButton({ className, onGameCreated }: CreateDevelGameButtonProps) {
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const onButtonClicked = async (e: MouseEvent<HTMLButtonElement>) => {
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

    const develGame = await createDevelGameEvents({
      publicKey: publicKeyOrNull,
      privateKey: privateKeyOrNull,
    })

    develGame.events.forEach((event) => {
      outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(event))
    })

    onGameCreated(e, develGame.gameId)
  }

  return (
    <button
      type="button"
      className={`${className || 'bg-white bg-opacity-20 rounded px-2 py-1 mx-1'}`}
      onClick={(e: MouseEvent<HTMLButtonElement>) => onButtonClicked(e)}
    >
      Create Devel Game
    </button>
  )
}
/*
interface CreateDefaultDevelGameButtonProps {
  buttonRef?: RefObject<HTMLButtonElement>
}

export function CreateDefaultDevelGameButton({ buttonRef }: CreateDefaultDevelGameButtonProps) {


  return <CreateGameButton buttonRef={buttonRef} onGameCreated={onGameCreated} />
}*/
