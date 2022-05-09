import React, { useState, createContext, useContext, ProviderProps, useEffect } from 'react'
import * as secp256k1 from '@alephium/noble-secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { Buffer } from 'buffer'

import { AppSettings, useSettings } from './SettingsContext'
import { SelectedBot } from '../components/BotSelector'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { AppDexie, GameStartEvent, db, GameMoveEvent } from '../util/app_db'
import * as Bot from '../util/bot'
import { getSession } from '../util/session'
import { hashToPrivateKey, publicKey } from '../util/nostr/identity'
import { useGameStore } from './GameEventStoreContext'
import { useLiveQuery } from 'dexie-react-hooks'
import * as JesterUtils from '../util/jester'
import { displayKey, pubKeyDisplayName } from '../util/app'
import { useOutgoingNostrEvents } from './NostrEventsContext'
import { ChessInstance } from '../components/ChessJsTypes'
// @ts-ignore
import * as Chess from 'chess.js'
import { historyToMinimalPgn } from '../util/chess'
import useBotSuggestion from '../hooks/BotMoveSuggestion'

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

const botName = (pubkey: NIP01.PubKey, bot: Bot.InitialisedBot) => {
  return `${bot.name}(${pubKeyDisplayName(pubkey)})`
}
const optionalBotName = (pubkey: NIP01.PubKey | null, bot: Bot.InitialisedBot | null) => {
  return `${bot?.name}(${pubkey ? pubKeyDisplayName(pubkey) : 'no key'})`
}

/*
const useBotSuggestion = (selectedBot: SelectedBot, game: ChessInstance | null): BotMoveSuggestion => {
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingFens, setThinkingFens] = useState<Bot.Fen[]>([])
  const [latestThinkingFen, setLatestThinkingFen] = useState<Bot.Fen | null>(null)
  //const [move, setMove] = useState<Bot.ShortMove | null>(null)
  //const [moveFen, setMoveFen] = useState<Bot.Fen | null>(null)
  const [gameOver, setGameOver] = useState<boolean>(game?.game_over() || false)

  const [suggestion, setSuggestion] = useState<BotMoveSuggestion>({
    isThinking: false,
    move: null
  });


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

        setIsThinking(false)
        setSuggestion({
          isThinking: false,
          move: {
            fen: thinkingFen,
            move: { from, to }
          }
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
      clearTimeout(timer)
    }
  }, [selectedBot, thinkingFens, isThinking])

  return suggestion
}*/

type KeyPair = {
  publicKey: NIP01.PubKey
  privateKey: NostrEvents.PrivKey
}

interface JesterBotContextEntry {
  bot: string
}

const JesterBotContext = createContext<JesterBotContextEntry | undefined>(undefined)

// TODO: currently, the bot can only be white
// TODO: whenever the current game changes, see if the bot started the game and activate!    
const JesterBotProvider = ({ children }: ProviderProps<JesterBotContextEntry | undefined>) => {
  const wtfUseBot = useBot

  const settings = useSettings()
  const gameStore = useGameStore()
  const outgoingNostr = useOutgoingNostrEvents()
  const [selectedBot, setSelectedBot] = useState<SelectedBot | null>(wtfUseBot(settings.botName))
  const [botKeyPair, setBotKeyPair] = useState<KeyPair | null>(null)

  const userPublicKeyOrNull = settings.identity?.pubkey || null
  const userPrivateKeyOrNull = getSession()?.privateKey || null
  const currentGameJesterId = settings.currentGameJesterId
  const [watchGameId, setWatchGameId] = useState<NIP01.EventId | null>(null)
  const [currentChessInstance, setCurrentChessInstance] = useState<ChessInstance | null>(null)

  const botMoveSuggestion = useBotSuggestion(selectedBot, currentChessInstance)
  const [currentBotMoveSuggestion, setCurrentBotMoveSuggestion] = useState(botMoveSuggestion)

  const [currentGameHead, setCurrentGameHead] = useState<GameMoveEvent | null>(null)
  const allGamesCreatedByBot = useLiveQuery(
    async () => {
      if (!botKeyPair) {
        return null
      }
      const gameStartEventsCreatedByBot = await gameStore.game_start
        .where('pubkey')
        .equals(botKeyPair.publicKey)
        .sortBy('created_at')

      return gameStartEventsCreatedByBot
    },
    [botKeyPair],
    null
  )
  const currentWatchGameStartEvent = useLiveQuery(async () => {
    if (!watchGameId) return

    const event = await gameStore.game_start.get(watchGameId)
    if (!event) return

    return event
  }, [watchGameId])

  const currentWatchGameMoves = useLiveQuery(
    async () => {
      if (!watchGameId) return []

      const events = await gameStore.game_move.where('gameId').equals(watchGameId).sortBy('moveCounter')
      return events
    },
    [watchGameId],
    [] as GameMoveEvent[]
  )

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
    if (!selectedBot) return
    if (!botKeyPair) return
    if (!outgoingNostr) return
    if (!userPublicKeyOrNull) return

    if (allGamesCreatedByBot === null) {
      console.error(`[Bot TODO] '${selectedBot?.name}': Still waiting to receive games..`)
      return
    }
    const abortCtrl = new AbortController()
    if (allGamesCreatedByBot.length === 0) {
      console.error(`[Bot TODO] '${selectedBot?.name}': I have not created any games..`)
      
      // TODO: create one
        NostrEvents.signEvent(
          JesterUtils.constructPrivateStartGameEvent(botKeyPair.publicKey, userPublicKeyOrNull),
          botKeyPair.privateKey
        ).then((signedEvent) => {
          if(abortCtrl.signal.aborted) return

          console.error('--------------------------- WOULD SEND VIA NOSTR: ', signedEvent)
          return new Promise<NIP01.Event>(function (resolve, reject) {
            setTimeout(() => {
              if (abortCtrl.signal.aborted) {
                reject(new Error('State has been aborted'))
              } else {
                try {
                  outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
                  resolve(signedEvent)
                } catch (e) {
                  reject(e)
                }
              }
            }, 1)
          })
        }).then((event) => {
          console.info('[Bot] Sent event via nostr..', event?.id)
        }).catch((e) => {
          console.warn('[Bot] Error while sending start event..', e)
        })
    } else  if (allGamesCreatedByBot.length > 0) {
      console.error(`[Bot TODO] '${selectedBot?.name}': I am watching ${allGamesCreatedByBot.length} games...`)
    }

    return () => {
      abortCtrl.abort()
    }
  }, [selectedBot, allGamesCreatedByBot, userPublicKeyOrNull, botKeyPair, outgoingNostr])

  useEffect(() => {
    if (allGamesCreatedByBot === null || allGamesCreatedByBot.length === 0) {
      setWatchGameId(null)
      return
    }

    // TODO: whenever the current game changes, see if the bot started the game and activate!    
    console.error(`[Bot TODO] '${selectedBot?.name}': I saw game id or my games change - should I chime in?`)

    setWatchGameId((current) => {
      if (!currentGameJesterId) {
        return null
      }    
      const currentGameId = JesterUtils.jesterIdToGameId(currentGameJesterId)
      if (current === currentGameId) {
        return current
      }

      const matchingGames = allGamesCreatedByBot.filter((it) => it.id === currentGameId)
      const matchingGame = matchingGames.length > 0 ? matchingGames[0] : null
      return matchingGame?.id || null
    })
  }, [currentGameJesterId, allGamesCreatedByBot])

  useEffect(() => {
    console.error(`[Bot TODO] '${selectedBot?.name}': I have a purpose now - watching`, watchGameId)
  }, [watchGameId])



  useEffect(() => {
    if (!currentWatchGameStartEvent) {
      setCurrentGameHead(null)
      return
    }
    // TODO:::::::::: search game head

    if (currentWatchGameMoves.length > 0) {
      setCurrentGameHead(currentWatchGameMoves[currentWatchGameMoves.length - 1])
    }
    /*const chessInstance = new Chess.Chess()

    if (currentWatchGameMoves.length === 0) {
      
    }

    setCurrentGameHead(chessInstance)*/
  }, [currentWatchGameStartEvent, currentWatchGameMoves])

  useEffect(() => {
    if (currentGameHead === null) {
      setCurrentChessInstance(new Chess.Chess())
      return
    }
    
    const chessInstance = new Chess.Chess()
    const content: JesterUtils.JesterProtoContent = JSON.parse(currentGameHead.content)

    const pgn = historyToMinimalPgn(content.history)
    const validPgn = chessInstance.load_pgn(pgn)
    if (!validPgn) {
      return 
    }
    setCurrentChessInstance(chessInstance)
  }, [currentGameHead])

  

  useEffect(() => {
    setCurrentBotMoveSuggestion((current) => {
      console.log('CURRENT BOT MOVE SUGGESTION CHANGED', current, botMoveSuggestion)
      if (current.move?.fen === botMoveSuggestion.move?.fen) {
        return current
      }
      return botMoveSuggestion
    })
  }, [botMoveSuggestion])

  useEffect(() => {
    if (!outgoingNostr) return
    if (!currentBotMoveSuggestion || !currentBotMoveSuggestion.move)  {
      
      console.log('----------------------------------------------- No Bot move suggestion')
      return
    }
    if (!currentChessInstance) {
      
      console.log('----------------------------------------------- No Bot CHess Instance')
      return
    }
    if (!botKeyPair) return
    if (!currentWatchGameStartEvent) return

    // TODO: currently, the bot is always white - this means a user cannot challenge a bot at the moment
    if (currentChessInstance.turn() !== 'w') return
    if (currentChessInstance.fen() !== currentBotMoveSuggestion.move.fen) return

    const abortCtrl = new AbortController()
    const parentMoveId = currentGameHead?.id || currentWatchGameStartEvent.id
    const isGameStart = parentMoveId === currentWatchGameStartEvent.id

    if (isGameStart && currentChessInstance.fen() !== JesterUtils.FEN_START_POSITION) {
      console.error('Something is very wrong.. refrain from doing anything..');
      return
    }

    const chessboardWithNewMove = new Chess.Chess()
    if (!isGameStart) {
      // load pgn does not work when the game has no moves - only load pgn if it is not game start!
      if (!chessboardWithNewMove.load_pgn(currentChessInstance.pgn())) {
        console.error('The current chessboard is not valid.. wtf?');
        return
      }
    }
    const successfulMove = chessboardWithNewMove.move(currentBotMoveSuggestion.move.move)
    if (!successfulMove) {
      console.error('The move the bot suggested is somehow invalid?!');
      return
    }

    const moveEvent = JesterUtils.constructGameMoveEvent(botKeyPair.publicKey, currentWatchGameStartEvent.id, parentMoveId, chessboardWithNewMove)


    NostrEvents.signEvent(
      moveEvent,
      botKeyPair.privateKey
    ).then((signedEvent) => {
      if (abortCtrl.signal.aborted) return
      return new Promise<NIP01.Event>(function (resolve, reject) {
        setTimeout(() => {
          if (abortCtrl.signal.aborted) {
            reject(new Error('State has been aborted'))
          } else {
            try {
              outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
              resolve(signedEvent)
            } catch (e) {
              reject(e)
            }
          }
        }, 1)
      })
    }).then((e) => {
      console.info('[Bot] Sent event', e)
    }).catch((e) => {
      console.error('[Bot] Could not send nostr event', e)
    })

    console.log('---------currentBotMoveSuggestddddddddddion-----------------------', currentBotMoveSuggestion)

    return () => {
      abortCtrl.abort()
    }
  }, [outgoingNostr, currentBotMoveSuggestion, currentChessInstance, botKeyPair, currentWatchGameStartEvent, currentGameHead])

  

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

export { JesterBotContext, JesterBotProvider, useJesterBot }
