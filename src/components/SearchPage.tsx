import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Button, Form } from 'react-daisyui'

import { H1, H4, H6 } from './Headings'
import { useIncomingNostrEvents } from '../context/NostrEventsContext'
import { useSettings } from '../context/SettingsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import JesterId from '../components/jester/JesterId'
import { NoConnectionAlert } from '../components/NoConnectionAlert'

import * as JesterUtils from '../util/jester'

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
    <Form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()

        props.onSearchButtonClicked(searchInputValue)
      }}
    >
      <div className="flex pb-2">
        <div className="grow form-control">
          <Input
            type="text"
            size="lg"
            value={searchInputValue}
            onChange={onSearchInputChange}
            placeholder="jester1..."
            color={props.error ? 'error' : undefined}
          />
        </div>

        <div className="flex-none ml-1">
          <Button type="submit" size="lg">
            Search
          </Button>
        </div>
      </div>
    </Form>
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
    <div className="screen-search">
      <div className="flex justify-center items-center">
        <div className="w-full grid grid-cols-1 lg:w-8/12">
          {!incomingNostr ? (
            <NoConnectionAlert />
          ) : (
            <>
              <div className="w-full mt-16 grid grid-cols-1">
                <div className="flex justify-center">
                  <H1>Search</H1>
                </div>

                <div className="my-1">
                  <small>
                    Search for games, <span style={{ textDecoration: 'line-through' }}>players and other stuff.</span>
                  </small>
                  <small className="text-secondary"> not quite yet... Coming soon!</small>
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
                      <H4>No results found. </H4>
                      {inputLooksLikeJesterId ? (
                        <>
                          <H6>Damn... there must be a typo somewhere... : (</H6>
                          <p>
                            It kind of looks like a{' '}
                            <code className="mx-1 p-1 text-xs font-semibold border border-base-content/20 hover:border-base-content/40 rounded">
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
