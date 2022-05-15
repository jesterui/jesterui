// @ts-ignore
import * as Chess from 'chess.js'
import { prepareEngine, UninitialisedEngine } from './uci';

export type AvailableBots = Record<string, UninitialisedEngine>

const randomMove: UninitialisedEngine = () => {
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
  Alice: prepareEngine('/bots/stockfish.js-10.0.2/stockfish.js', ['setoption name Skill Level value 1', 'go depth 1']),
  'Risky Alice': prepareEngine('/bots/stockfish.js-10.0.2/stockfish.js', [
    'setoption name Skill Level value 1', // 0 - 20
    'setoption name Contempt value 0', // -100 - 100
    //'setoption name King Safety value 0',
    //'setoption name Style value Risky',
    'go depth 1',
  ]),
  Bob: prepareEngine('/bots/stockfish.js-10.0.2/stockfish.js', ['setoption name Skill Level value 1', 'go movetime 1000']),
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
  Jester: prepareEngine('/bots/stockfish.js-10.0.2/stockfish.js', [
    'setoption name Skill Level value 20', // 0 - 20
    'setoption name Contempt value 42', // -100 - 100
    //'setoption name Style value Risky',
    //'setoption name King Safety value 0',
    'go depth 10',
  ]),
  Chaos: randomMove,
}
