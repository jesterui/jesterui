import React, { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import JesterId from '../components/jester/JesterId'
import { NoConnectionAlert } from '../components/NoConnectionAlert'

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
import { useSetWindowTitle } from '../hooks/WindowTitle'

interface SearchFromProps {
  onSearchButtonClicked: (val: string) => void
  onSearchInputChange?: (val: string) => void
  error?: boolean
  success?: boolean
}
const SearchFrom = (props: SearchFromProps) => {
  const [searchInputValue, setSearchInputValue] = useState<string>('')

  const onSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setSearchInputValue(searchTerm)

    if (props.onSearchInputChange) {
      props.onSearchInputChange(searchTerm)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()

        props.onSearchButtonClicked(searchInputValue)
      }}
    >
      <div className="pb-2 w-full">
        <div className="flex">
          <div className="grow">
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

          <div className="ml-1 flex-none">
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
  useSetWindowTitle({ text: 'Search' })

  const settings = useSettings()
  const navigate = useNavigate()
  const incomingNostr = useIncomingNostrEvents()
  const gameStore = useGameStore()

  const [searchResults, setSearchResults] = useState<string[] | null>(null)
  const [inputLooksLikeJesterId, setInputLooksLikeJesterId] = useState<boolean | null>(null)
  const [inputIsJesterId, setInputIsJesterId] = useState<boolean | null>(null)
  const currentGameJesterId = useMemo(() => settings.currentGameJesterId, [settings])
  const [exampleJesterId, setExampleJesterId] = useState<JesterUtils.JesterId>(
    currentGameJesterId || JesterUtils.VALID_JESTER_ID_EXAMPLE
  )

  useEffect(() => {
    if (currentGameJesterId) {
      setExampleJesterId(currentGameJesterId)
      return
    }

    const abortCtrl = new AbortController()
    gameStore.game_start
      .toCollection()
      .reverse()
      .first()
      .then((it) => {
        if (abortCtrl.signal.aborted) return
        if (it) {
          setExampleJesterId(JesterUtils.gameIdToJesterId(it.id))
        } else {
          setExampleJesterId(JesterUtils.VALID_JESTER_ID_EXAMPLE)
        }
      })
      .catch((e) => {
        if (abortCtrl.signal.aborted) return
        console.warn('Could not use example jesterId from db')
        setExampleJesterId(JesterUtils.VALID_JESTER_ID_EXAMPLE)
      })

    return () => abortCtrl.abort()
  }, [currentGameJesterId, gameStore])

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
    navigate(`/redirect/game/${jesterId}`, { replace: true })
  }

  const onSearchInputChange = () => {
    setInputLooksLikeJesterId(null)
    setInputIsJesterId(null)
    setSearchResults(null)
  }

  return (
    <div className="screen-index">
      <div className="flex justify-center items-center">
        <div className="w-full grid grid-cols-1 lg:w-8/12">
          {!incomingNostr ? (
            <NoConnectionAlert />
          ) : (
            <>
              <div className="w-full mt-16 grid grid-cols-1">
                <div className="flex justify-center">
                  <Heading1 color="blueGray">Search</Heading1>
                </div>

                <div className="my-1">
                  <Small color="">
                    Search for games, <span style={{ textDecoration: 'line-through' }}>players and other stuff.</span>
                  </Small>
                  <Small color="orange"> not quite yet... Coming soon!</Small>
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
                          <p>
                            <small>e.g. a game id looks like this:</small>
                          </p>
                          <p>
                            <code className="text-xs font-semibold px-2.5 py-1 rounded">
                              <JesterId jesterId={exampleJesterId} />
                            </code>
                          </p>
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
