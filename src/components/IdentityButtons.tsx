import { RefObject, useEffect, useCallback } from 'react'

import { AppSettings, Identity, useSettingsDispatch } from '../context/SettingsContext'

import { setSessionAttribute } from '../util/session'
import * as NostrIdentity from '../util/nostr/identity'

interface GenerateRandomIdentityButtonProps {
  onIdentityCreated?: (identity: Identity) => void
  buttonRef: RefObject<HTMLElement>
}

export function GenerateRandomIdentityButton({
  buttonRef,
  onIdentityCreated,
}: GenerateRandomIdentityButtonProps) {
  const settingsDispatch = useSettingsDispatch()

  const newIdentityButtonClicked = useCallback(async () => {
    const privateKey = NostrIdentity.generatePrivateKey()
    const publicKey = NostrIdentity.publicKey(privateKey)

    const identity = { pubkey: publicKey }
    setSessionAttribute({ privateKey })
    settingsDispatch({ identity: identity } as AppSettings)

    if (onIdentityCreated) {
      onIdentityCreated(identity)
    }
  }, [settingsDispatch, onIdentityCreated])

  const onClick = useCallback(() => newIdentityButtonClicked(), [newIdentityButtonClicked])

  useEffect(() => {
    if (!buttonRef.current) return

    buttonRef.current.onclick = onClick
  }, [buttonRef, onClick])

  return <></>
}
