import React, { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
import BoardById from './GameById'
import CreateGameButton from './CreateGameButton'

import * as NIP01 from '../util/nostr/nip01'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'

export default function Index() {
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const settings = useSettings()

  const onGameCreated = (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.Sha256) => {
    navigate(`/game/${gameId}`)
  }

  if (settings.currentGameId) {
    return <BoardById gameId={settings.currentGameId} />
  }

  return (
    <div className="screen-index">
      {<Heading1 color="blueGray">Gameboard</Heading1>}
      <div className="flex justify-center items-center">
        {!incomingNostr ? <div>No connection to nostr</div> : (<>
        <CreateGameButton onGameCreated={onGameCreated} 
          className={`bg-white bg-opacity-20 rounded px-5 py-5`} />
      </>)}
      </div>
    </div>
  )
}
