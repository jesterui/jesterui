import React, { useState, createContext, useContext, ProviderProps, useEffect } from 'react'
import * as secp256k1 from '@alephium/noble-secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { Buffer } from 'buffer'

import { AppSettings, useSettings } from './SettingsContext'
import { SelectedBot } from '../components/BotSelector'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { AppDexie, GameStartEvent, db } from '../util/app_db'
import * as Bot from '../util/bot'
import { getSession } from '../util/session'
import { hashToPrivateKey, publicKey } from '../util/nostr/identity'
import { useGameStore } from './GameEventStoreContext'
import { useLiveQuery } from 'dexie-react-hooks'
import * as JesterUtils from '../util/jester'

export const hashWithSha256 = (val: string): NIP01.Sha256 => {
  let eventHash = sha256
    .init()
    .update(Buffer.from(val))
    .digest()
  return Buffer.from(eventHash).toString('hex')
}

const useBot = (botName: string | null): SelectedBot | null => {
  if (botName && Bot.Bots[botName]) {
    return {
      name: botName,
      move: Bot.Bots[botName](),
    }
  }
  return null
}

type KeyPair = {
  publicKey: NIP01.PubKey
  privateKey: NostrEvents.PrivKey
}

interface JesterBotContextEntry {
  bot: string
}

const JesterBotContext = createContext<JesterBotContextEntry | undefined>(undefined)

const JesterBotProvider = ({ children }: ProviderProps<JesterBotContextEntry | undefined>) => {
  const wtfUseBot = useBot

  const settings = useSettings()
  const gameStore = useGameStore()
  const [watchGameStartEventRef, setWatchGameStartEventRef] = useState<NIP01.EventId | null>(null)
  const [selectedBot, setSelectedBot] = useState<SelectedBot | null>(wtfUseBot(settings.botName))
  const [botKeyPair, setBotKeyPair] = useState<KeyPair | null>(null)

  const userPrivateKeyOrNull = getSession()?.privateKey || null
  /*const listOfStartGamesLiveQuery = useLiveQuery(
    async () => {
      const events = await gameStore.game_start
        .where('pubkey')
        .equals()
        .limit(MAX_AMOUNT_OF_GAMES)
        .toArray()

      return events
    },
    [gameStartEventFilter],
    null
  )*/

  useEffect(() => {
    const bot = wtfUseBot(settings.botName)
    setSelectedBot((current) => {
      if (current && current.name === settings.botName) {
        return current
      }
      return bot
    })
  }, [settings])

  useEffect(() => {
    if (!userPrivateKeyOrNull) {
      setBotKeyPair(null)
    } else {
      const hashOrNull = hashWithSha256(userPrivateKeyOrNull)
      const botPrivateKey = hashToPrivateKey(hashOrNull + hashOrNull)
      setBotKeyPair({
        privateKey: botPrivateKey,
        publicKey: publicKey(botPrivateKey)
      })
    }
  }, [userPrivateKeyOrNull])

  useEffect(() => {
    console.debug(`[Bot] Bot changed to`, selectedBot?.name)

    if (!selectedBot) return

  }, [selectedBot])

  useEffect(() => {
    console.debug(`[Bot] '${selectedBot?.name}' pubkey changed to`, botKeyPair?.publicKey)

    setWatchGameStartEventRef(() => {
      if (!botKeyPair) {
        return null
      }
      const botPublicKeyHashed = hashWithSha256(botKeyPair.publicKey)
      const eventId = hashWithSha256(botPublicKeyHashed + JesterUtils.JESTER_START_GAME_E_REF)
      return eventId
    })
  }, [botKeyPair])

  useEffect(() => {
    console.debug(`[Bot] '${selectedBot?.name}' changed watch game to`, watchGameStartEventRef)
    if (!watchGameStartEventRef) return


    /*db.transaction('r', db.game_start, db.game_move, () => {
      db.game_start.where()
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
        .catch((e) => console.debug('error while adding event - might already exist', e))
    })*/

  }, [watchGameStartEventRef])

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

/*
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
        </>
      )}
    </>
  )
}*/

export { JesterBotContext, JesterBotProvider, useJesterBot }
