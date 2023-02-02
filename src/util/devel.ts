import { Pgn } from '../util/chess'
import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as JesterUtils from '../util/jester'

import * as Chess from 'chess.js'

const DEFAULT_EXAMPLE_DEVEL_GAME_PGN = '1. f3 e5 2. g4 Qh4#'

type KeyPair = {
  publicKey: NIP01.PubKey
  privateKey: NostrEvents.PrivKey
}

type DevelGame = {
  gameId: NIP01.EventId
  events: NIP01.Event[]
}

export const createDevelGameEvents = async (keyPair: KeyPair) => {
  return createGameEventsOfPgn(keyPair, DEFAULT_EXAMPLE_DEVEL_GAME_PGN)
}

export const createGameEventsOfPgn = async (keyPair: KeyPair, pgn: Pgn): Promise<DevelGame> => {
  const fullChessInstance: Chess.Chess = new Chess.Chess()
  const stateChessInstance: Chess.Chess = new Chess.Chess()


  try {
    fullChessInstance.loadPgn(pgn)
  } catch(e) {
    throw new Error(`Could not load pgn`, { cause: e})
  }

  const gameStart = NostrEvents.signEvent(JesterUtils.constructStartGameEvent(keyPair.publicKey), keyPair.privateKey)
  const events = [gameStart]

  const history = fullChessInstance.history({ verbose: true })
  let currentHead = gameStart

  for (let i = 0; i < history.length; i++) {
    const move = history[i]
    const successfulMove = stateChessInstance.move(move)
    if (!successfulMove) {
      throw new Error(`Could not make move on index ${i}`)
    }

    const gameMove = NostrEvents.signEvent(
      JesterUtils.constructGameMoveEvent(keyPair.publicKey, gameStart.id, currentHead.id, stateChessInstance),
      keyPair.privateKey
    )
    events.push(gameMove)
    currentHead = gameMove
  }

  return {
    gameId: gameStart.id,
    events,
  }
}
