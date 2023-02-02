import { useState, useEffect, useRef } from 'react'

import { SelectedBot } from '../components/BotSelector'
import * as Chess from 'chess.js'

import * as UCI from '../util/uci'
import { AnalyticsEngine } from '../util/bot'
import { GameMoveEvent } from '../util/app_db'
import * as JesterUtils from '../util/jester'

interface MoveAndFen {
  move: UCI.ShortMove
  fen: UCI.Fen
}

interface BotMoveSuggestion {
  isThinking: boolean
  move: MoveAndFen | null
}

const engineConsole =
  process.env.NODE_ENV === 'development'
    ? console
    : {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      }

const VALIDATION_INSTANCE = new Chess.Chess()
const isValidPgn = (pgn: string) => {
  try {
    VALIDATION_INSTANCE.loadPgn(pgn)
    return true
  } catch(e) {
    return false
  }
}

export default function useBotSuggestion(
  selectedBot: SelectedBot,
  gameEvent: GameMoveEvent | undefined
): BotMoveSuggestion {
  const isThinking = useRef(false)
  const [thinkingFens, setThinkingFens] = useState<UCI.Fen[]>([])

  const [suggestion, setSuggestion] = useState<BotMoveSuggestion>({
    isThinking: isThinking.current,
    move: null,
  })

  const game = useRef<Chess.Chess>(new Chess.Chess())

  useEffect(() => {
    if (!gameEvent) {
      game.current.reset()
      return
    }

    const content: JesterUtils.JesterProtoContent = JSON.parse(gameEvent.content)

    if (!isValidPgn(content.pgn)) {
      engineConsole.error('[Engine] Current gameEvent has no valid pgn')
      return
    }

    game.current.loadPgn(content.pgn)

    setThinkingFens((currentFens) => {
      if (game.current.isGameOver()) {
        return []
      }

      const newFen = game.current.fen()

      if (currentFens[currentFens.length - 1] === newFen) {
        return currentFens
      }
      return [...currentFens, newFen]
    })

    if (game.current !== undefined && !game.current.isGameOver()) {
      AnalyticsEngine.eval(game.current)
        .then((result) => {
          engineConsole.info(`[Engine] Evaluation of ${game.current?.fen()}: `, result)
        })
        .catch((e: Error) => engineConsole.warn('[Engine] Error during eval', e))
    }
  }, [game, gameEvent])

  useEffect(() => {
    if (!selectedBot) return
    if (isThinking.current === true) return
    if (thinkingFens.length === 0) return

    const thinkingFen = thinkingFens[thinkingFens.length - 1]

    const abortCtrl = new AbortController()
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) {
        engineConsole.warn(
          `[Engine] '${selectedBot.name}' wanted to search for ${thinkingFen} - but operation was aborted.`
        )
        return
      }
      const inBetweenUpdate = thinkingFen !== thinkingFens[thinkingFens.length - 1]
      if (inBetweenUpdate) return

      isThinking.current = true
      engineConsole.info(`[Engine] Asking '${selectedBot.name}' for move suggestion to ${thinkingFen}...`)

      selectedBot.bot
        .move(thinkingFen)
        .then(({ from, to }: UCI.ShortMove) => {
          if (abortCtrl.signal.aborted) {
            console.warn(
              `[Engine] Bot ${selectedBot.name} found move from ${from} to ${to} - but operation was aborted.`
            )
            return
          }
          engineConsole.info(`[Engine] '${selectedBot.name}' found move from ${from} to ${to}.`)

          isThinking.current = false
          setSuggestion({
            isThinking: false,
            move: {
              fen: thinkingFen,
              move: { from, to },
            },
          })

          setThinkingFens((currentFens) => {
            const i = currentFens.indexOf(thinkingFen)
            if (i < 0) {
              return currentFens
            }

            const copy = [...currentFens]
            // remove all thinking fens that came before this
            copy.splice(0, i + 1)
            return copy
          })
        })
        .catch((e: Error) => engineConsole.warn('[Engine] Error during move suggestion', e))
    }, 1)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [selectedBot, thinkingFens, isThinking])

  return suggestion
}
