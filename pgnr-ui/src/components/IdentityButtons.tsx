import React, { RefObject } from 'react'

import { AppSettings, Identity, useSettingsDispatch } from '../context/SettingsContext'
import { setSessionAttribute } from '../util/session'
import * as NostrIdentity from '../util/nostr/identity'

interface GenerateRandomIdentityButtonProps {
  onIdentityCreated?: (identity: Identity) => void
  buttonRef?: RefObject<HTMLButtonElement>
  className?: string
  text?: string
}

export function GenerateRandomIdentityButton({
  buttonRef,
  className,
  onIdentityCreated,
  text = 'New identity',
}: GenerateRandomIdentityButtonProps) {
  const settingsDispatch = useSettingsDispatch()

  const newIdentityButtonClicked = async () => {
    const privateKey = NostrIdentity.generatePrivateKey()
    const publicKey = NostrIdentity.publicKey(privateKey)

    const identity = { pubkey: publicKey }
    setSessionAttribute({ privateKey })
    settingsDispatch({ identity: identity } as AppSettings)

    if (onIdentityCreated) {
      onIdentityCreated(identity)
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${className || 'bg-white bg-opacity-20 rounded px-2 py-1 mx-1 my-1'}`}
      onClick={() => newIdentityButtonClicked()}
    >
      {text}
    </button>
  )
}
