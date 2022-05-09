import React, { useState, createContext, useContext, ProviderProps, useEffect } from 'react'

import * as NIP01 from '../util/nostr/nip01'
import { AppDexie, GameStartEvent, db } from '../util/app_db'
import * as Bot from '../util/bot'
import { AppSettings, useSettings } from './SettingsContext'
import { SelectedBot } from '../components/BotSelector'


const useBot = (botName: string | null): SelectedBot | null => {
  if (botName && Bot.Bots[botName]) {
    return {
      name: botName,
      move: Bot.Bots[botName](),
    }
  }
  return null
}

interface JesterBotContextEntry {
  bot: string
}

const JesterBotContext = createContext<JesterBotContextEntry | undefined>(undefined)

const JesterBotProvider = ({ children }: ProviderProps<JesterBotContextEntry | undefined>) => {

  const settings = useSettings()

  const [selectedBot, setSelectedBot] = useState<SelectedBot | null>(useBot(settings.botName))

  useEffect(() => {
    setSelectedBot((current) => {
      if (current && current.name === settings.botName) {
        return current
      }
      return useBot(settings.botName)
    })
  }, [settings])

  console.log('selectedBot --------------------------------------------------------------- ' + selectedBot?.name)

  useEffect(() => {
    if (!selectedBot) return

    db.transaction('r', db.game_start, db.game_move, () => {
      /*db.game_start.where()
        .then((val) => {
          console.debug('added event', val)
          return val
        })
        .then((_) => {
          const targetEventRefs = nostrEvent.tags.filter((t) => t && t[0] === 'e').map((t) => t[1] as NIP01.EventId)
          const nostrEventRefs: NostrEventRef = { sourceId: nostrEvent.id, targetIds: targetEventRefs }
          return db.nostr_event_refs.put(nostrEventRefs)
        })
        .then((val) => {
          console.debug('added event refs', val)
          return val
        })
        .catch((e) => console.debug('error while adding event - might already exist', e))*/
    })
  }, [selectedBot])

  return (
    <>
      <JesterBotContext.Provider value={{ bot: 'Chester' }}>{children}</JesterBotContext.Provider>
    </>
  )
}


const useJesterBot = () => {
  const context = useContext(JesterBotContext)
  if (context === undefined) {
    throw new Error('useJesterBot must be used within a JesterBotProvider')
  }

  return context.bot
}


const BotMoveSuggestions = () => {
  // { game }: { game: ChessInstance | null }
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
          {/*Latest Thinking Fen: {latestThinkingFen}*/}
        </>
      )}
    </>
  )
}

export { JesterBotContext, JesterBotProvider, useJesterBot }
