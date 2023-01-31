import { useEffect, useState } from 'react'

import { useSettings, useSettingsDispatch } from '../../context/SettingsContext'
import { DEFAULT_RELAYS } from '../../util/app_nostr'

export default function NostrManageRelays() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return

    const noNostrRelayConfigured = !settings.relays || settings.relays.length === 0
    if (noNostrRelayConfigured) {
      settingsDispatch({ relays: [DEFAULT_RELAYS[0]] })
    }

    setInitialized(true)
  }, [initialized, settings, settingsDispatch])

  return <></>
}
