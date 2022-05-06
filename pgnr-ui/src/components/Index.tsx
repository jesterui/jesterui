import React, { ChangeEvent, useState } from 'react'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { CreateGameAndRedirectButton } from './CreateGameButton'
import { useNavigate } from 'react-router-dom'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Heading6 from '@material-tailwind/react/Heading6'
// @ts-ignore
import Input from '@material-tailwind/react/Input'
import { JESTER_START_GAME_E_REF } from '../util/jester'

export default function Index() {
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const [searchInputValue, setSearchInputValue] = useState<string>('')
  const [searchResults, setSearchResults] = useState<string[] | null>(null)

  const search = (searchInput: string) => {
    // never subscribe to any short event prefix
    // accidentially subscribing to "0" or "01" will overflow your connection with events
    if (!searchInput || searchInput.length < 12) {
      setSearchResults([])
      return
    }
    // currently, the search value must be an event id
    if (searchInput.length !== JESTER_START_GAME_E_REF.length) {
      setSearchResults([])
    } else {
      // at the moment, just redirect to the game - may not exist but thats fine for now
      setSearchResults(null)
      navigate(`/redirect/game/${searchInput}`)
    }
  }

  const onSearchButtonClicked = () => {
    search(searchInputValue)
  }

  const onSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value)
    setSearchResults(null)
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
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchInputChange(e)}
                  placeholder="Search"
                />
              </div>

              <div className="flex justify-center items-center">
                <CreateGameAndRedirectButton className={`bg-white bg-opacity-20 rounded px-5 py-5 mx-1 my-4`} />

                <button
                  type="button"
                  className={`bg-white bg-opacity-20 rounded px-5 py-5 mx-1 my-4`}
                  onClick={() => onSearchButtonClicked()}
                >
                  Search
                </button>
              </div>
              <div className="pb-2 grow">
                {searchResults?.length === 0 && (<>
                  <Heading6 color="blueGray">No results found. </Heading6>
                  <p>
                      Are you sure this is a game id?
                  </p>
                  <p>
                    <small>e.g. a game id looks like this: <code>000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f</code></small>
                  </p>
                </>)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
