import React, { MouseEvent, ChangeEvent, useState } from 'react'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { CreateGameAndRedirectButton } from './CreateGameButton'
import { useNavigate } from 'react-router-dom'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Input from '@material-tailwind/react/Input'

export default function Index() {
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const [searchInputValue, setSearchInputValue] = useState<string>('')

  const search = (searchInput: string) => {
    if (!searchInput) return

    navigate(`/redirect/game/${searchInput}`)
  }

  const triggerSearch = () => {
    search(searchInputValue)
  }

  return (
    <div className="screen-index">
      <div className="flex justify-center items-center">
        {!incomingNostr ? (
          <div>No connection to nostr</div>
        ) : (
          <>
            <div className="w-full grid grid-cols-1">
              <div className="flex justify-center">{<Heading1 color="blueGray">chess on nostr</Heading1>}</div>
              <div className="pb-2 grow">
                <Input
                  type="text"
                  size="lg"
                  outline={true}
                  value={searchInputValue}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInputValue(e.target.value)}
                  placeholder="Search"
                />
              </div>

              <div className="flex justify-center items-center">
                <CreateGameAndRedirectButton className={`bg-white bg-opacity-20 rounded px-5 py-5 mx-1 my-4`} />

                <button
                  type="button"
                  className={`bg-white bg-opacity-20 rounded px-5 py-5 mx-1 my-4`}
                  onClick={triggerSearch}
                >
                  Search
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
