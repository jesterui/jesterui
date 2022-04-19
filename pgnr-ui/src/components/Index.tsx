import React, { useEffect, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCurrentGame, useSetCurrentGame } from '../context/GamesContext'
import BoardById from './GameById'
import CreateGameButton from './CreateGameButton'

import { useIncomingNostrEvents, useIncomingNostrEventsBuffer } from '../context/NostrEventsContext'
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
  const incomingNostrBuffer = useIncomingNostrEventsBuffer()
  const currentGame = useCurrentGame()
  const setCurrentGame = useSetCurrentGame()

  // if no game is active, search the events if a game has been started
  // search from the newest element on and set the game to it

  // TODO:  can lead to current game not being selected because of "too many start events"
  useEffect(() => {
    // TODO: what if game is over? `currentGame.game.game_over()`
    /*if(currentGame && currentGame.game.game_over()) {
      setCurrentGame((_) => null)
      return
    }*/
    if (currentGame) return

    const abortCtrl = new AbortController()
    const timer = setTimeout(() => {
      const bufferState = incomingNostrBuffer.state()

      for (const eventId of bufferState.order) {
        const event = bufferState.events[eventId]

        if (AppUtils.isStartGameEvent(event)) {
          const color = ['white', 'black'][Math.floor(Math.random() * 2)] as cg.Color
          setCurrentGame((_) => ({
            id: event.id,
            game: new Chess.Chess(),
            color: ['white', 'black'] || [color], // TODO: currently make it possible to move both colors
          }))

          break
        }
      }
    }, 10)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [incomingNostrBuffer, currentGame, setCurrentGame])

  const onGameCreated = (e: MouseEvent<HTMLButtonElement>, gameId: NIP01.Sha256) => {
    navigate(`/game:/${gameId}`)
  }

  if (currentGame) {
    return <BoardById gameId={currentGame.id} />
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
