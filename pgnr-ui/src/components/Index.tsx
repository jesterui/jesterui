import React, { ChangeEvent, MouseEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
import BoardById from './GameById'
import CreateGameButton from './CreateGameButton'

import * as NIP01 from '../util/nostr/nip01'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Input from '@material-tailwind/react/Input'

export default function Index() {
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const [searchInputValue, setSearchInputValue] = useState<string | null>(null)

  const onGameCreated = (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.Sha256) => {
    navigate(`/game/${gameId}`)
  }

  return (
    <div className="screen-index">
      <div className="flex justify-center items-center">
        {!incomingNostr ? (
          <div>No connection to nostr</div>
        ) : (
          <>
            <div className="w-full grid grid-cols-1">
              <div className="flex justify-center">{<Heading1 color="blueGray">Chess on Nostr</Heading1>}</div>

              <div className="flex justify-center items-center">
                <CreateGameButton
                  onGameCreated={onGameCreated}
                  className={`bg-white bg-opacity-20 rounded px-5 py-5 mx-1 my-4`}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
