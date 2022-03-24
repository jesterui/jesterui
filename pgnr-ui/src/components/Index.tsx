import React, { useEffect, useState } from 'react'

import { useCurrentGame, useSetCurrentGame, Game } from '../context/GamesContext'
import Chessboard from '../components/chessground/Chessground'
import PgnTable from '../components/chessground/PgnTable'

import { useSettings } from '../context/SettingsContext'
import { useOutgoingNostrEvents, useIncomingNostrEvents } from '../context/NostrEventsContext'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { getSession } from '../util/session'
import * as AppUtils from '../util/pgnrui'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance } from '../components/ChessJsTypes'
import * as cg from 'chessground/types'

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

export default function Index() {
  const incomingNostr = useIncomingNostrEvents()
  const outgoingNostr = useOutgoingNostrEvents()
  const setCurrentGame = useSetCurrentGame()
  const game = useCurrentGame()
  const settings = useSettings()

  const [latestEvent, setLatestEvent] = useState<NIP01.Event | null>(null)

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

  useEffect(() => {
    if (!latestEvent) return

    const isGameStartEvent = latestEvent.tags.filter((t) => t[0] === 'e' && t[1] === AppUtils.PGNRUI_START_GAME_E_REF)
    if (isGameStartEvent) {
      setCurrentGame((currentGame) => {
        const currentGameInProgress = currentGame !== null && !currentGame.game.game_over()
        if (currentGameInProgress) {
          return currentGame
        }

        const color = ['white', 'black'][Math.floor(Math.random() * 2)] as cg.Color
        return {
          game: new Chess(),
          color: ['white', 'black'] || [color], // TODO: currently make it possible to move both colors
        }
      })
    }
  }, [latestEvent])

  useEffect(() => {
    if (!incomingNostr) return

    const abortCtrl = new AbortController()
    incomingNostr.on(
      NIP01.RelayEventType.EVENT,
      (event: CustomEvent<NIP01.RelayMessage>) => {
        if (event.type !== NIP01.RelayEventType.EVENT) return
        const req = event.detail as NIP01.RelayEventMessage

        const data = req[2]
        setLatestEvent(data)
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [incomingNostr])

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
