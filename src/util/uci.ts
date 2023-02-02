import * as Chess from 'chess.js'

export type ShortMove = Pick<Chess.Move, 'from' | 'to'>
export type EvalResult = {
  totalEvaluation: number
}
export type Fen = string
export type UninitialisedEngine = () => Engine
export type Engine = {
  move: (fen: Fen) => Promise<ShortMove>
  eval: (game: Chess.Chess) => Promise<EvalResult>
  terminate: () => void
  isTerminated: () => boolean
}

const DEV = process.env.NODE_ENV === 'development'

// e.g. "bestmove b8c8 ponder f4h4"
const BESTMOVE_REGEX = /^bestmove\s([a-h][1-8])([a-h][1-8])/
// e.g. "Total Evaluation: -0.07 (white side)"
const TOTAL_EVALUATION_REGEX = /^Total [E|e]valuation:\s(-?\d+\.?\d+)[\s\S]+$/
// e.g. "info depth 1 seldepth 1 multipv 1 score cp 593 nodes 482 nps 28352 time 17 pv a2a4 d5a5 e1d1 bmc 5"
var SCORE_REGEX = /^info .*\bscore (\w+) (-?\d+)/

const getMovesForStockfish = (game: Chess.Chess) => {
  const history = game.history({ verbose: true })

  let moves = ''
  for (let i = 0; i < history.length; i++) {
    const move = history[i]
    moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '')
  }

  return moves
}

export const prepareEngine =
  (name: string, file: string, actions: Array<string>): UninitialisedEngine =>
  () => {
    let terminated = false
    DEV && console.debug(`[UCI]`, `Creating new worker for ${name} from ${file}`)
    const worker = new Worker(file, { name })

    let bestmoveResolver: ((move: ShortMove) => void) | null = null
    let evalResolver: ((result: EvalResult) => void) | null = null

    worker.addEventListener('message', (uciMessage) => {
      if (uciMessage.data === '') return

      DEV && console.debug(`[UCI]`, uciMessage)

      const move = uciMessage.data.match(BESTMOVE_REGEX)
      if (move && bestmoveResolver) {
        bestmoveResolver({ from: move[1], to: move[2] })
        bestmoveResolver = null
      }

      const evaluation = uciMessage.data.match(TOTAL_EVALUATION_REGEX)
      if (evaluation && evalResolver) {
        const score = parseFloat(uciMessage.data.match(TOTAL_EVALUATION_REGEX)[1])
        evalResolver({ totalEvaluation: score })
        evalResolver = null
      }

      const matchScoreMessage = uciMessage.data.match(SCORE_REGEX)
      if (matchScoreMessage) {
        var score = parseInt(matchScoreMessage[2])
        var centipawns = matchScoreMessage[1] === 'cp' // cp: score in centipawns
        var foundMate = matchScoreMessage[1] === 'mate' // mate: moves until mate

        let moveScore = ''
        if (centipawns) {
          moveScore = (score / 100.0).toFixed(2)
        } else if (foundMate) {
          moveScore = 'Mate in ' + Math.abs(score)
        }

        DEV && console.info(`[Engine] Found move score: `, moveScore)
      }
    })

    return {
      move: (fen) => {
        if (terminated) {
          return Promise.reject(new Error('Bot is already terminated'))
        }

        return new Promise((resolve, reject) => {
          if (bestmoveResolver) {
            reject('Pending move is present')
            return
          }

          bestmoveResolver = resolve
          worker.postMessage(`position fen ${fen}`)
          actions.forEach((action) => worker.postMessage(action))
        })
      },
      eval: (game) => {
        if (terminated) {
          return Promise.reject(new Error('Bot is already terminated'))
        }

        return new Promise((resolve, reject) => {
          if (evalResolver) {
            reject('Pending eval is present')
            return
          }

          evalResolver = resolve

          const moves = getMovesForStockfish(game)
          DEV && console.debug(`[UCI] POST 2 messages ${name}.`)
          worker.postMessage(`position startpos moves ${moves}`)
          worker.postMessage(`eval`)
        })
      },

      terminate: () => {
        if (terminated) return

        terminated = true
        worker.terminate()
        DEV && console.debug(`[UCI] Terminate worker ${name}.`)
      },
      isTerminated: () => terminated,
    }
  }
