import React, { useEffect, useState } from 'react'

import { useCurrentGame, useSetCurrentGame, Game } from '../context/GamesContext'
import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'

import { useSettings } from '../context/SettingsContext'
import {
  useOutgoingNostrEvents,
  useIncomingNostrEvents,
  useIncomingNostrEventsBuffer,
} from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { getSession } from '../util/session'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'

export default function GamesOverview() {
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const settings = useSettings()

  const [games, setGames] = useState<NIP01.Event[]>([])

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  useEffect(() => {
    const bufferState = incomingNostrBuffer.state()

    // TODO: defer here... should not iterate over all events everytime..
    const orderedGameStartedEvents = bufferState.order
      .map((eventId) => bufferState.events[eventId])
      .filter((event) => AppUtils.isStartGameEvent(event))

    setGames(orderedGameStartedEvents)
  }, [incomingNostrBuffer])

  return (
    <div className="screen-games-overview">
      <Heading1 color="blueGray">Games</Heading1>
      {games.map((it) => {
        return <div>{it.id}</div>
      })}
    </div>
  )
}
