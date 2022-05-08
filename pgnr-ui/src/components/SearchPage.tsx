import React, { ChangeEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'

import JesterId from '../components/JesterId'

import * as JesterUtils from '../util/jester'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Heading4 from '@material-tailwind/react/Heading4'
// @ts-ignore
import Heading6 from '@material-tailwind/react/Heading6'
// @ts-ignore
import Input from '@material-tailwind/react/Input'
// @ts-ignore
import Button from '@material-tailwind/react/Button'
// @ts-ignore
import Small from '@material-tailwind/react/Small'

interface SearchFrom {
  onSearchButtonClicked: (val: string) => void
  onSearchInputChange?: (val: string) => void
  error?: boolean
  success?: boolean
}
const SearchFrom = (props: SearchFrom) => {
  const [searchInputValue, setSearchInputValue] = useState<string>('')

  const onSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setSearchInputValue(searchTerm)

    if (props.onSearchInputChange) {
      props.onSearchInputChange(searchTerm)
    }
  }

  return (
    <form noValidate onSubmit={() => props.onSearchButtonClicked(searchInputValue)}>
      <div className="pb-2 grow">
        <div className="flex justify-center">
          <div className="w-full">
            <Input
              type="text"
              size="lg"
              outline={true}
              value={searchInputValue}
              onChange={onSearchInputChange}
              placeholder="Search"
              style={{ color: 'currentColor' }}
              error={props.error ? ' ' : undefined}
              success={props.success === true ? ' ' : undefined}
            />
          </div>

          <div className="ml-1">
            <Button
              className="h-12"
              type="submit"
              color="deepOrange"
              buttonType="filled"
              size="lg"
              rounded={false}
              block={false}
              iconOnly={false}
              ripple="light"
            >
              Search
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default function SearchPage() {
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const [searchResults, setSearchResults] = useState<string[] | null>(null)
  const [inputLooksLikeJesterId, setInputLooksLikeJesterId] = useState<boolean | null>(null)
  const [inputIsJesterId, setInputIsJesterId] = useState<boolean | null>(null)

  const search = (searchInput: string) => {
    setInputLooksLikeJesterId(false)
    setInputIsJesterId(false)
    setSearchResults(null)

    if (!searchInput) {
      setSearchResults([])
      return
    }

    // currently, the search value must be a jester id
    const indexOfPrefix = searchInput.indexOf(JesterUtils.JESTER_ID_PREFIX + '1')
    if (indexOfPrefix < 0) {
      setSearchResults([])
      return
    }

    // try finding a jesterId in the input, e.g. might be an url "https://example.com/jester1abcdef123..."
    const possibleJesterId = searchInput.substring(indexOfPrefix)

    setInputLooksLikeJesterId(
      possibleJesterId.length > JesterUtils.VALID_JESTER_ID_EXAMPLE.length - 10 &&
        possibleJesterId.length < JesterUtils.VALID_JESTER_ID_EXAMPLE.length + 10
    )

    const jesterId = JesterUtils.tryParseJesterId(possibleJesterId as JesterUtils.JesterId)
    if (jesterId === null) {
      console.warn('Could not parse jesterId from search input value')
      setSearchResults([])
      return
    }

    setInputLooksLikeJesterId(true)
    setInputIsJesterId(true)
    setSearchResults(null)

    // at the moment, just redirect to the game - may not exist, but thats fine for now
    navigate(`/redirect/game/${jesterId}`)
  }

  const onSearchInputChange = () => {
    setInputLooksLikeJesterId(null)
    setInputIsJesterId(null)
    setSearchResults(null)
  }

  return (
    <div className="screen-index">
      <div className="flex justify-center items-center">
        <div className="w-full grid grid-cols-1 mt-16 lg:w-8/12">
          {!incomingNostr ? (
            <div>No connection to nostr</div>
          ) : (
            <>
              <div className="w-full grid grid-cols-1">
                <div className="flex justify-center">
                  <Heading1 color="blueGray">Search</Heading1>
                </div>

                <div className="flex">
                  <div className="mx-1">
                    <Small color="">
                      Search for games, <span style={{ textDecoration: 'line-through' }}>players and other stuff.</span>
                    </Small>
                    <Small color="orange"> not quite yet... Coming soon!</Small>
                  </div>
                </div>

                <SearchFrom
                  onSearchButtonClicked={search}
                  onSearchInputChange={onSearchInputChange}
                  error={inputIsJesterId === false ? true : undefined}
                  success={inputIsJesterId === true ? true : undefined}
                />

                <div className="pb-2 grow my-4">
                  {searchResults?.length === 0 && (
                    <>
                      <Heading4 color="blueGray">No results found. </Heading4>
                      {inputLooksLikeJesterId ? (
                        <>
                          <Heading6 color="blueGray">Damn... there must be a typo somewhere... : (</Heading6>
                          <p>
                            It kind of looks like a{' '}
                            <code className="border border-solid border-blue-gray-500 text-xs font-semibold mx-1 px-2.5 py-1 rounded">
                              jesterId
                            </code>
                            , but it contains errors.
                          </p>
                          <p>If you got this ID from another player, please verify the value and try again.</p>
                        </>
                      ) : (
                        <>
                          <p>Are you sure this is a valid game id?</p>
                          <small>
                            e.g. a game id looks like this:
                            <code className="text-xs font-semibold px-2.5 py-1 rounded">
                              <JesterId jesterId={JesterUtils.VALID_JESTER_ID_EXAMPLE} />
                            </code>
                          </small>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
