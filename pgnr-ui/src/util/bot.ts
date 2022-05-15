// @ts-ignore
import * as Chess from 'chess.js'

export type ShortMove = { from: string; to: string }
export type Fen = string
export type UninitialisedBot = () => InitialisedBot
export type InitialisedBot = {
  move: (fen: Fen) => Promise<ShortMove>
  terminate: () => void
  isTerminated: () => boolean
}
export type AvailableBots = Record<string, UninitialisedBot>

const DEV = process.env.NODE_ENV === 'development'

const uciWorker =
  (file: string, actions: Array<string>): UninitialisedBot =>
  () => {
    let terminated = false
    const worker = new Worker(file)

    let resolver: ((move: ShortMove) => void) | null = null

    worker.addEventListener('message', (uciMessage) => {
      DEV && console.debug(`[Engine]`, uciMessage)

      const move = uciMessage.data.match(/^bestmove\s([a-h][1-8])([a-h][1-8])/)
      if (move && resolver) {
        resolver({ from: move[1], to: move[2] })
        resolver = null
      }
    })

    return {
      move: (fen) => {
        if (terminated) {
          return Promise.reject(new Error('Bot is already terminated'))
        }

        return new Promise((resolve, reject) => {
          if (resolver) {
            reject('Pending move is present')
            return
          }

          resolver = resolve
          worker.postMessage(`position fen ${fen}`)
          actions.forEach((action) => worker.postMessage(action))
        })
      },
      terminate: () => {
        if (terminated) return

        terminated = true
        worker.terminate()
      },
      isTerminated: () => terminated,
    }
  }

const randomMove: UninitialisedBot = () => {
  let terminated = false
  return {
    move: (fen) => {
      return new Promise((resolve) => {
        const moves = new Chess.Chess(fen).moves({ verbose: true })
        const { from, to } = moves[Math.floor(Math.random() * moves.length)]
        setTimeout(() => resolve({ from, to }), 500)
      })
    },
    terminate: () => {
      terminated = true
    },
    isTerminated: () => terminated,
  }
}

// https://ucichessengine.wordpress.com/2011/03/16/description-of-uci-protocol/
// https://github.com/official-stockfish/Stockfish#the-uci-protocol-and-available-options
export const Bots: AvailableBots = {
  Alice: uciWorker('/bots/stockfish.js-10.0.2/stockfish.js', ['setoption name Skill Level value 1', 'go depth 1']),
  'Risky Alice': uciWorker('/bots/stockfish.js-10.0.2/stockfish.js', [
    'setoption name Skill Level value 1', // 0 - 20
    'setoption name Contempt value 0', // -100 - 100
    //'setoption name King Safety value 0',
    //'setoption name Style value Risky',
    'go depth 1',
  ]),
  Bob: uciWorker('/bots/stockfish.js-10.0.2/stockfish.js', ['setoption name Skill Level value 1', 'go movetime 1000']),
  /*'stockfish (l:1,d:1)': uciWorker('/bots/stockfish.js-10.0.2/stockfish.js', [
    'setoption name Skill Level value 1',
    'go depth 1',
  ]),
  'stockfish (l:1,t:1s)': uciWorker('/bots/stockfish.js-10.0.2/stockfish.js', [
    'setoption name Skill Level value 1',
    'go movetime 1000',
  ]),
  'stockfish (l:20,d:10)': uciWorker('/bots/stockfish.js-10.0.2/stockfish.js', [
    'setoption name Skill Level value 20',
    'go depth 10',
  ]),
  'stockfish (l:20,t:1s)': uciWorker('/bots/stockfish.js-10.0.2/stockfish.js', [
    'setoption name Skill Level value 20',
    'go movetime 1000',
  ]),*/
  Jester: uciWorker('/bots/stockfish.js-10.0.2/stockfish.js', [
    'setoption name Skill Level value 20', // 0 - 20
    'setoption name Contempt value 42', // -100 - 100
    //'setoption name Style value Risky',
    //'setoption name King Safety value 0',
    'go depth 10',
  ]),
  Chaos: randomMove,
}
