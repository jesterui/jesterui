import { useMemo, MouseEvent } from 'react'
import { Button } from 'react-daisyui'

import { useSettings } from '../../context/SettingsContext'
import { useOutgoingNostrEvents } from '../../context/NostrEventsContext'
import * as NIP01 from '../../util/nostr/nip01'
import { getSession } from '../../util/session'
import { createDevelGameEvents } from '../../util/devel'

interface CreateDevelGameButtonProps {
  onGameCreated: (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.EventId) => void
}

export default function CreateDevelGameButton({ onGameCreated }: CreateDevelGameButtonProps) {
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
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
    <Button color="warning" variant="outline" onClick={(e: MouseEvent<HTMLButtonElement>) => onButtonClicked(e)}>
      DEV: Create Devel Game
    </Button>
  )
}
