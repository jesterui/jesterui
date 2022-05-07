import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as JesterUtils from '../util/jester'
// @ts-ignore
import * as Chess from 'chess.js'
import { ChessInstance } from '../components/ChessJsTypes'
import { Pgn } from './chess'

const DEFAULT_DEVEL_GAME_PGN =
  '1. a3 a6 2. b3 b6 3. c3 c6 4. a4 a5 5. b4 b5 6. c4 c5 7. d3 d6 8. d4 d5 9. Ra2 Ra7 10. Ra1 Ra8 11. Ra3 Ra6 12. Nc3 Nc6 13. Qc2 Bb7 14. Kd2 Bc8 15. Bb2 Qc7 16. e3 dxc4 17. f3 h6 18. h3 g6 19. g3 h5 20. g4 hxg4 21. h4 f6 22. Nh3 g5 23. Nxg5 fxg5 24. fxg4 e6 25. Bg2 Ke7 26. Bxc6 Bd7 27. Bxd7 Qxd7 28. hxg5 Rxh1 29. g6 Bg7 30. g5 Nf6 31. gxf6+ Bxf6 32. g7 Bxg7 33. e4 Bxd4 34. e5 Bxc3+ 35. Kxc3 cxb4#'

type KeyPair = {
  publicKey: NIP01.PubKey
  privateKey: NostrEvents.PrivKey
}

type DevelGame = {
  gameId: NIP01.EventId
  events: NIP01.Event[]
}

export const createDevelGameEvents = async (keyPair: KeyPair) => {
  return createGameEventsOfPgn(keyPair, DEFAULT_DEVEL_GAME_PGN)
}

export const createGameEventsOfPgn = async (keyPair: KeyPair, pgn: Pgn): Promise<DevelGame> => {
  const fullChessInstance: ChessInstance = new Chess.Chess()
  const stateChessInstance: ChessInstance = new Chess.Chess()

  const loaded = fullChessInstance.load_pgn(pgn)
  if (!loaded) {
    throw new Error(`Could not load pgn`)
  }

  const gameStart = await NostrEvents.signEvent(
    JesterUtils.constructStartGameEvent(keyPair.publicKey),
    keyPair.privateKey
  )
  const events = [gameStart]

  const history = fullChessInstance.history({ verbose: true })
  let currentHead = gameStart

  for (let i = 0; i < history.length; i++) {
    const move = history[i]
    const successfulMove = stateChessInstance.move(move)
    if (!successfulMove) {
      throw new Error(`Could not make move on index ${i}`)
    }

    const gameMove = await NostrEvents.signEvent(
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
