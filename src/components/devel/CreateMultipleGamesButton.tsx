import { useRef, useMemo } from 'react'
import { Button } from 'react-daisyui'

import { useSettings } from '../../context/SettingsContext'
import { useOutgoingNostrEvents } from '../../context/NostrEventsContext'
import { getSession } from '../../util/session'
import { CreateGameButton } from '../CreateGameButton'

const NOOP = () => {}

interface CreateMultipleGamesButtonProps {
  amount: number
}

export default function CreateMultipleGamesButton({ amount = 10 }: CreateMultipleGamesButtonProps) {
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()
  const createGameButtonRef = useRef<HTMLButtonElement>(null)

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  const onButtonClicked = async (amount: number) => {
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

    __dev_createMultipleGames(amount)
  }

  const __dev_createMultipleGames = (amount: number) => {
    const chunks = 3

    if (amount <= chunks) {
      for (let i = 0; i < amount; i++) {
        createGameButtonRef.current?.click()
      }
    } else {
      __dev_createMultipleGames(chunks)
      setTimeout(() => __dev_createMultipleGames(amount - chunks), 4)
    }
  }

  return (
    <>
      <div style={{ display: 'none' }}>
        <button type="button" ref={createGameButtonRef}></button>
        <CreateGameButton buttonRef={createGameButtonRef} onGameCreated={NOOP} />
      </div>

      <Button color="warning" variant="outline" onClick={() => onButtonClicked(amount)}>
        DEV: Start {amount} games
      </Button>
    </>
  )
}
