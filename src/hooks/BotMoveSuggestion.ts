import { useState, useEffect } from 'react'

import { SelectedBot } from '../components/BotSelector'
import { ChessInstance } from 'chess.js'

import * as UCI from '../util/uci'
import { AnalyticsEngine } from '../util/bot'

interface MoveAndFen {
  move: UCI.ShortMove
  fen: UCI.Fen
}

interface BotMoveSuggestion {
  isThinking: boolean
  move: MoveAndFen | null
}

const botConsole =
  process.env.NODE_ENV === 'development'
    ? console
    : {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      }

export default function useBotSuggestion(selectedBot: SelectedBot, game: ChessInstance | null): BotMoveSuggestion {
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingFens, setThinkingFens] = useState<UCI.Fen[]>([])

  const [suggestion, setSuggestion] = useState<BotMoveSuggestion>({
    isThinking: false,
    move: null,
  })

  useEffect(() => {
    setThinkingFens((currentFens) => {
      if (game === null || game.game_over()) {
        return []
      }
      const newFen = game.fen()

      if (currentFens[currentFens.length - 1] === newFen) {
        return currentFens
      }
      return [...currentFens, newFen]
    })

    if (game !== null && !game.game_over()) {
      AnalyticsEngine.eval(game)
        .then((result) => {
          botConsole.info(`[Engine] Evaluation of ${game.fen()}: `, result)
        })
        .catch((e: Error) => botConsole.warn('[Engine] Error during eval', e))
    }
  }, [game])

  useEffect(() => {
    if (!selectedBot) return
    if (isThinking) return
    if (thinkingFens.length === 0) return

    const thinkingFen = thinkingFens[thinkingFens.length - 1]

    const abortCtrl = new AbortController()
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) {
        botConsole.warn(`[Bot] '${selectedBot.name}' wanted to search for ${thinkingFen} - but operation was aborted.`)
        return
      }
      const inBetweenUpdate = thinkingFen !== thinkingFens[thinkingFens.length - 1]
      if (inBetweenUpdate) return

      setIsThinking(true)
      botConsole.info(`[Bot] Asking '${selectedBot.name}' for move suggestion to ${thinkingFen}...`)

      selectedBot.bot
        .move(thinkingFen)
        .then(({ from, to }: UCI.ShortMove) => {
          /*if (abortCtrl.signal.aborted) {
            console.warn(`Bot ${selectedBot.name} found move from ${from} to ${to} - but operation was aborted.`)
            return
        }*/
          botConsole.info(`[Bot] '${selectedBot.name}' found move from ${from} to ${to}.`)

          setIsThinking(false)
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
        .catch((e: Error) => botConsole.warn('[Bot] Error during move suggestion', e))
    }, 100)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [selectedBot, thinkingFens, isThinking])

  return suggestion
}
