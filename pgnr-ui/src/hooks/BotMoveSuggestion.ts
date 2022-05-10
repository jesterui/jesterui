import { useState, useEffect } from 'react'

import { SelectedBot } from '../components/BotSelector'

import * as Bot from '../util/bot'
import { ChessInstance } from '../components/ChessJsTypes'

interface MoveAndFen {
  move: Bot.ShortMove
  fen: Bot.Fen
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
  const [thinkingFens, setThinkingFens] = useState<Bot.Fen[]>([])

  const [suggestion, setSuggestion] = useState<BotMoveSuggestion>({
    isThinking: false,
    move: null,
  })

  useEffect(() => {
    setThinkingFens((currentFens) => {
      if (game === null || game.game_over()) {
        return []
      }

      const currentFen = game.fen()

      if (currentFens[currentFens.length - 1] === currentFen) {
        return currentFens
      }
      return [...currentFens, currentFen]
    })
  }, [game])

  useEffect(() => {
    if (!selectedBot) return
    if (isThinking) return
    if (thinkingFens.length === 0) return

    const thinkingFen = thinkingFens[thinkingFens.length - 1]

    const abortCtrl = new AbortController()
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) {
        botConsole.warn(`Bot ${selectedBot.name} wanted to search for ${thinkingFen} - but operation was aborted.`)
        return
      }
      const inBetweenUpdate = thinkingFen !== thinkingFens[thinkingFens.length - 1]
      if (inBetweenUpdate) return

      setIsThinking(true)
      botConsole.info(`Asking bot ${selectedBot.name} for move suggestion to ${thinkingFen}...`)

      selectedBot.move(thinkingFen).then(({ from, to }: Bot.ShortMove) => {
        /*if (abortCtrl.signal.aborted) {
            console.warn(`Bot ${selectedBot.name} found move from ${from} to ${to} - but operation was aborted.`)
            return
        }*/
        botConsole.info(`Bot ${selectedBot.name} found move from ${from} to ${to}.`)

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
    }, 100)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [selectedBot, thinkingFens, isThinking])

  return suggestion
}

/*
const BotMoveSuggestions = ({ game }: { game: ChessInstance | null }) => {
  const settings = useSettings()

  const [selectedBot] = useState<SelectedBot>(
    (() => {
      if (settings.botName && Bot.Bots[settings.botName]) {
        return {
          name: settings.botName,
          move: Bot.Bots[settings.botName](),
        }
      }
      return null
    })()
  )

  const [isThinking, setIsThinking] = useState(false)
  const [thinkingFens, setThinkingFens] = useState<Bot.Fen[]>([])
  const [latestThinkingFen, setLatestThinkingFen] = useState<Bot.Fen | null>(null)
  const [move, setMove] = useState<Bot.ShortMove | null>(null)
  const [gameOver, setGameOver] = useState<boolean>(game?.game_over() || false)

  useEffect(() => {
    if (game === null) return

    if (game.game_over()) {
      setGameOver(true)
      return
    }

    const currentFen = game.fen()
    setThinkingFens((currentFens) => {
      if (currentFens[currentFens.length - 1] === currentFen) {
        return currentFens
      }
      return [...currentFens, currentFen]
    })
  }, [game])

  useEffect(() => {
    if (!selectedBot) return
    if (isThinking) return
    if (thinkingFens.length === 0) return

    const thinkingFen = thinkingFens[thinkingFens.length - 1]

    const timer = setTimeout(() => {
      const inBetweenUpdate = thinkingFen !== thinkingFens[thinkingFens.length - 1]
      if (inBetweenUpdate) return

      setIsThinking(true)
      setLatestThinkingFen(thinkingFen)
      console.log(`Asking bot ${selectedBot.name} for move suggestion to ${thinkingFen}...`)

      selectedBot.move(thinkingFen).then(({ from, to }: Bot.ShortMove) => {
        console.log(`Bot ${selectedBot.name} found move from ${from} to ${to}.`)

        setMove({ from, to })

        setIsThinking(false)
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
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [selectedBot, thinkingFens, isThinking])

  if (!selectedBot) {
    return <>No bot selected.</>
  }

  return (
    <>
      {`${selectedBot.name}`}
      {gameOver ? (
        ` is ready for the next game.`
      ) : (
        <>
          {!isThinking && !move && thinkingFens.length === 0 && ` is idle...`}
          {isThinking && thinkingFens.length > 0 && ` is thinking (${thinkingFens.length})...`}
          {!isThinking && move && ` suggests ${JSON.stringify(move)}`}
        </>
      )}
    </>
  )
}*/
