import React, { useEffect, useState } from 'react'
import './App.css'
import AppNavbar from './components/AppNavbar'
import Settings from './components/Settings'
import Layout from './Layout'

import { useCurrentGame, useSetCurrentGame, Game } from './context/GamesContext'
import Chessboard from './components/chessground/Chessground'
import PgnTable from './components/chessground/PgnTable'

import { useSettings, Subscription } from './context/SettingsContext'
import { useOutgoingNostrEvents, useIncomingNostrEvents } from './context/NostrEventsContext'
import * as NIP01 from './util/nostr/nip01'
import * as NostrEvents from './util/nostr/events'
import { getSession } from './util/session'
import * as AppUtils from './util/pgnrui'
import { arrayEquals } from './util/utils'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance } from './components/ChessJsTypes'
import * as cg from 'chessground/types'
import { Route, Routes, Navigate } from 'react-router-dom'

function BoardContainer({ game, onGameChanged }: { game: Game; onGameChanged: (game: ChessInstance) => void }) {
  const updateGameCallback = (modify: (g: ChessInstance) => void) => {
    console.debug('[Chess] updateGameCallback invoked')
    const copyOfGame = { ...game.game }
    modify(copyOfGame)
    onGameChanged(copyOfGame)
  }

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: 400, height: 400 }}>
        {game && <Chessboard game={game!.game} userColor={game!.color} onAfterMoveFinished={updateGameCallback} />}
      </div>
      {game && (
        <div className="pl-2 overflow-y-scroll">
          <PgnTable game={game!.game} />
        </div>
      )}
    </div>
  )
}

function Index() {
  const outgoingNostr = useOutgoingNostrEvents()
  const setCurrentGame = useSetCurrentGame()
  const game = useCurrentGame()
  const settings = useSettings()

  const publicKeyOrNull = settings.identity?.pubkey || null
  const privateKeyOrNull = getSession()?.privateKey || null

  const onGameChanged = (game: ChessInstance) => {
    setCurrentGame((currentGame) => {
      if (!currentGame) return null
      return { ...currentGame, game }
    })
    sendGameStateViaNostr(game)
  }

  const sendGameStateViaNostr = async (game: ChessInstance) => {
    if (!outgoingNostr) {
      console.info('Nostr EventBus not ready..')
      return
    }
    if (!publicKeyOrNull) {
      console.info('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      console.info('PrivKey not available..')
      return
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const eventParts = NostrEvents.blankEvent()
    eventParts.kind = 1 // text_note
    eventParts.pubkey = publicKey
    eventParts.created_at = Math.floor(Date.now() / 1000)
    eventParts.content = game.fen()
    const event = NostrEvents.constructEvent(eventParts)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit('EVENT', NIP01.createClientEventMessage(signedEvent))
  }

  /*useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()

    websocket.addEventListener(
      'message',
      ({ data: json }) => {
        const data = JSON.parse(json)
        if (!Array.isArray(data)) return
        if (!data[0]) return
        // ["EVENT","my-sub",{"id":"53ac913428bf1d5c80a55ba83f5432d1601892ba1b7dea6337c46d3d7cbbc82b","pubkey":"9999b801204877c7c73b9f0cbbbc026ac570c7953095179ba2d2aba633775f6a","created_at":1647994904,"kind":1,"tags":[],"content":"rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2","sig":"984b5b7c943165f70bef05a745fa6627659fbeff6fec91b108960c37ef5a24e8211ce99cca99c9ac407798458a3b82036c03f92af4c6b0e9fbe0b583b0e2ebf8"}]

        console.info(`[Nostr] <- ${json}`)
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [websocket])*/

  /*useEffect(() => {
    setCurrentGame((currentGame) => {
      if (currentGame) return currentGame

      const color = ['white', 'black'][Math.floor(Math.random() * 2)] as cg.Color
      return {
        game: new Chess(),
        color: ['white', 'black'] || [color], // TODO: currently make it possible to move both colors
      }
    })
  }, [setCurrentGame])*/

  const onStartGameButtonClicked = async () => {
    if (!outgoingNostr) {
      console.info('Nostr EventBus not ready..')
      return
    }
    if (!publicKeyOrNull) {
      console.info('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      console.info('PrivKey not available..')
      return
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const event = AppUtils.constructStartGameEvent(publicKey)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit('EVENT', NIP01.createClientEventMessage(signedEvent))
  }

  return (
    <div className="screen-index">
      <Heading1 color="blueGray">Gameboard</Heading1>
      {!game && (
        <button type="button" onClick={() => onStartGameButtonClicked()}>
          Start new game
        </button>
      )}
      {game && <BoardContainer game={game} onGameChanged={onGameChanged} />}
    </div>
  )
}

function NostrManageSubscriptions() {
  const settings = useSettings()
  const outgoingNostr = useOutgoingNostrEvents()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [closeSubscriptions, setCloseSubscriptions] = useState<Subscription[]>([])

  useEffect(() => {
    if (!outgoingNostr) return
    if (closeSubscriptions.length === 0) return

    const abortCtrl = new AbortController()

    closeSubscriptions.forEach((sub) => {
      outgoingNostr.emit('CLOSE', NIP01.createClientCloseMessage(sub.id))
    })

    setCloseSubscriptions([])
    return () => abortCtrl.abort()
  }, [closeSubscriptions, outgoingNostr])

  useEffect(() => {
    if (!outgoingNostr) return
    if (subscriptions.length === 0) return

    const abortCtrl = new AbortController()

    subscriptions.forEach((sub) => {
      outgoingNostr.emit('REQ', NIP01.createClientReqMessage(sub.id, sub.filters))
    })

    return () => abortCtrl.abort()
  }, [outgoingNostr, subscriptions])

  // initialize subscriptons based on settings
  useEffect(() => {
    const subscriptionsFromSettings = settings.subscriptions || []
    const resubscribe = !arrayEquals(subscriptions, subscriptionsFromSettings)

    if (resubscribe) {
      console.log('[Nostr] Will resubscribe..', subscriptionsFromSettings)
      setSubscriptions((currentSubs) => {
        const newSubs = [...subscriptionsFromSettings]
        const newSubsIds = newSubs.map((s) => s.id)
        const closeSubs = currentSubs.filter((val) => !newSubsIds.includes(val.id))

        setCloseSubscriptions(closeSubs)

        return newSubs
      })
    }
  }, [subscriptions, settings])

  return <></>
}

function NostrLogIncomingRelayEvents() {
  const incomingNostr = useIncomingNostrEvents()

  useEffect(() => {
    if (!incomingNostr) return

    const abortCtrl = new AbortController()
    incomingNostr.on(
      NIP01.RelayEventType.EVENT,
      (event: CustomEvent<NIP01.RelayMessage>) => {
        if (event.type !== NIP01.RelayEventType.EVENT) return
        const req = event.detail as NIP01.RelayEventMessage

        console.info(`[Nostr] LOGGING INCOMING EVENT`, req)
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [incomingNostr])

  useEffect(() => {
    if (!incomingNostr) return

    const abortCtrl = new AbortController()
    incomingNostr.on(
      NIP01.RelayEventType.NOTICE,
      (event: CustomEvent<NIP01.RelayMessage>) => {
        if (event.type !== NIP01.RelayEventType.NOTICE) return
        const req = event.detail as NIP01.RelayNoticeMessage

        console.info(`[Nostr] LOGGING INCOMING NOTICE`, req)
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [incomingNostr])

  return <></>
}

export default function App() {
  return (
    <>
      <>
        <NostrManageSubscriptions />
        <NostrLogIncomingRelayEvents />
      </>
      <div className="App">
        <header className="App-header w-full">
          <AppNavbar />
        </header>
        <section className="App-container">
          <Routes>
            <Route element={<Layout variant={null} />}>
              <Route path="/" element={<Index />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace={true} />} />
            </Route>
          </Routes>
        </section>
        <footer className="App-footer">
          <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </footer>
      </div>
    </>
  )
}
