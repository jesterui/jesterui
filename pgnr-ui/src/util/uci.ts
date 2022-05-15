export type ShortMove = { from: string; to: string }
export type Fen = string
export type UninitialisedEngine = () => Engine
export type Engine = {
  move: (fen: Fen) => Promise<ShortMove>
  terminate: () => void
  isTerminated: () => boolean
}

const DEV = process.env.NODE_ENV === 'development'

export const prepareEngine =
  (file: string, actions: Array<string>): UninitialisedEngine =>
  () => {
    let terminated = false
    const worker = new Worker(file)

    let bestmoveResolver: ((move: ShortMove) => void) | null = null

    worker.addEventListener('message', (uciMessage) => {
      DEV && console.debug(`[Engine]`, uciMessage)

      // e.g. "bestmove b8c8 ponder f4h4"
      const move = uciMessage.data.match(/^bestmove\s([a-h][1-8])([a-h][1-8])/)
      if (move && bestmoveResolver) {
        bestmoveResolver({ from: move[1], to: move[2] })
        bestmoveResolver = null
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
      terminate: () => {
        if (terminated) return

        terminated = true
        worker.terminate()
      },
      isTerminated: () => terminated,
    }
  }
