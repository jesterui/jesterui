import React from 'react'

import { useSettings } from '../context/SettingsContext'
import { useOutgoingNostrEvents } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { getSession } from '../util/session'
import * as AppUtils from '../util/pgnrui'

export default function CreateGameButton({ onGameCreated }: { onGameCreated: (gameId: NIP01.Sha256) => void }) {
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const onStartGameButtonClicked = async () => {
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

    onGameCreated(signedEvent.id)
  }

  return (
    <button
      type="button"
      className="bg-white bg-opacity-20 rounded px-2 py-1"
      onClick={() => onStartGameButtonClicked()}
    >
      Start new game
    </button>
  )
}
