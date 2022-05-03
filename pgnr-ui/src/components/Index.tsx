import React, { useEffect, MouseEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
import BoardById from './GameById'
import CreateGameButton from './CreateGameButton'

import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import * as Chess from 'chess.js'
import * as cg from 'chessground/types'

export default function Index() {
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const settings = useSettings()
  
  const onGameCreated = (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.Sha256) => {
    navigate(`/game:/${gameId}`)
  }

  if (settings.currentGameId) {
    return <BoardById gameId={settings.currentGameId} />
  }

  return (
    <div className="screen-index">
      {<Heading1 color="blueGray">Gameboard</Heading1>}
      <div className="flex justify-center items-center">
        {!incomingNostr ? <div>No connection to nostr</div> : <CreateGameButton onGameCreated={onGameCreated} />}
      </div>
    </div>
  )
}
