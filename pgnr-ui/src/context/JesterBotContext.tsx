import React, { useState, createContext, useContext, ProviderProps, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import {  useSettings } from './SettingsContext'
import useBotSuggestion from '../hooks/BotMoveSuggestion'

import { SelectedBot } from '../components/BotSelector'

import { useOutgoingNostrEvents } from './NostrEventsContext'
import { hashToPrivateKey, publicKey } from '../util/nostr/identity'
import { useGameStore } from './GameEventStoreContext'
import { ChessInstance } from '../components/ChessJsTypes'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as JesterUtils from '../util/jester'
import { GameMoveEvent } from '../util/app_db'
import { randomNumberBetween } from '../util/app'
import { getSession } from '../util/session'
import { historyToMinimalPgn } from '../util/chess'
import * as Bot from '../util/bot'

// @ts-ignore
import * as Chess from 'chess.js'

const DEFAULT_BOT: SelectedBot | null = ((name) => {
  try {
    return {
      name: name,
      move: Bot.Bots[name](),
    }
  } catch(e) {
    return null
  }
})('Alice')

const instantiateBotByName = (botName: string | null): SelectedBot | null => {
  if (botName && Bot.Bots[botName]) {
    return {
      name: botName,
      move: Bot.Bots[botName](),
    }
  }
  return DEFAULT_BOT
}

type KeyPair = {
  publicKey: NIP01.PubKey
  privateKey: NostrEvents.PrivKey
}

interface JesterBotContextEntry {
  bot: string
}

const botConsole =
  process.env.NODE_ENV === 'development'
    ? console
    : {
        debug: () => {},
        info: () => {},
        error: () => {},
      }

const JesterBotContext = createContext<JesterBotContextEntry | undefined>(undefined)

// TODO: currently, the bot can only move for white
const JesterBotProvider = ({ children }: ProviderProps<JesterBotContextEntry | undefined>) => {
  const settings = useSettings()
  const gameStore = useGameStore()
  const outgoingNostr = useOutgoingNostrEvents()

  const userPublicKeyOrNull = settings.identity?.pubkey || null
  const userPrivateKeyOrNull = getSession()?.privateKey || null

  const currentGameJesterId = settings.currentGameJesterId
  const selectedBotName = settings.botName

  const [botKeyPair, setBotKeyPair] = useState<KeyPair | null>(null)
  const [selectedBot, setSelectedBot] = useState<SelectedBot | null>(null)
  const [watchGameId, setWatchGameId] = useState<NIP01.EventId | null>(null)
  const [currentChessInstance, setCurrentChessInstance] = useState<ChessInstance | null>(null)
  const [currentGameHead, setCurrentGameHead] = useState<GameMoveEvent | null>(null)

  const botMoveSuggestion = useBotSuggestion(selectedBot, currentChessInstance)
  const [currentBotMoveSuggestion, setCurrentBotMoveSuggestion] = useState(botMoveSuggestion)

  const allGamesCreatedByBot = useLiveQuery(
    async () => {
      if (!botKeyPair) {
        return null
      }

      // TODO: filter for stopped games (e.g. game_over) => should this be added to the game event db?
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
    setSelectedBot((current) => {
      if (current && current.name === selectedBotName) {
        return current
      }

      return instantiateBotByName(selectedBotName)
    })
  }, [selectedBotName])

  useEffect(() => {
    if (!userPrivateKeyOrNull) {
      setBotKeyPair(null)
    } else {
      const hashOrNull = JesterUtils.hashWithSha256(userPrivateKeyOrNull)
      const botPrivateKey = hashToPrivateKey(hashOrNull + hashOrNull)
      setBotKeyPair({
        privateKey: botPrivateKey,
        publicKey: publicKey(botPrivateKey),
      })
    }
  }, [userPrivateKeyOrNull])

  useEffect(() => {
    botConsole.debug(`[Bot] Bot changed to`, selectedBot?.name)
  }, [selectedBot])

  useEffect(() => {
    if (!selectedBot) return
    if (!botKeyPair) return
    if (!outgoingNostr) return
    if (!userPublicKeyOrNull) return
    if (allGamesCreatedByBot === null) return
    if (allGamesCreatedByBot.length !== 0) return

    const abortCtrl = new AbortController()
    botConsole.debug(`[Bot TODO] '${selectedBot?.name}': I have not created any games..`)

    NostrEvents.signEvent(
      JesterUtils.constructPrivateStartGameEvent(botKeyPair.publicKey, userPublicKeyOrNull),
      botKeyPair.privateKey
    )
      .then((signedEvent) => {
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
      })
      .then((event) => {
        botConsole.info('[Bot] Sent event via nostr..', event?.id)
      })
      .catch((e) => {
        botConsole.error('[Bot] Error while sending start event..', e)
      })

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
    botConsole.error(`[Bot TODO] '${selectedBot?.name}': I saw game id or my games changed - should I chime in?`)

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
    if (!watchGameId) return
    if (!selectedBot) return

    botConsole.info(`[Bot] '${selectedBot.name}': I have a purpose now - playing game `, watchGameId)
  }, [watchGameId])

  useEffect(() => {
    setCurrentGameHead((_) => {
      if (!currentWatchGameStartEvent || currentWatchGameMoves.length === 0) {
        return null
      }
      return currentWatchGameMoves[currentWatchGameMoves.length - 1]
    })
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
      if (current.move?.fen === botMoveSuggestion.move?.fen) {
        return current
      }
      return botMoveSuggestion
    })
  }, [botMoveSuggestion])

  useEffect(() => {
    if (!outgoingNostr) return
    if (!currentChessInstance) return
    if (!botKeyPair) return
    if (!currentWatchGameStartEvent) return
    if (!currentBotMoveSuggestion || !currentBotMoveSuggestion.move) return

    // TODO: currently, the bot is always white - this means a user cannot challenge a bot at the moment
    if (currentChessInstance.turn() !== 'w') return
    if (currentChessInstance.fen() !== currentBotMoveSuggestion.move.fen) return

    const abortCtrl = new AbortController()
    const parentMoveId = currentGameHead?.id || currentWatchGameStartEvent.id
    const isGameStart = parentMoveId === currentWatchGameStartEvent.id

    const chessboardWithNewMove = new Chess.Chess()
    if (!isGameStart) {
      // load pgn does not work when the game has no moves - only load pgn if it is not game start!
      if (!chessboardWithNewMove.load_pgn(currentChessInstance.pgn())) {
        botConsole.error('The current chessboard is not valid.. wtf?')
        return
      }
    }
    const successfulMove = chessboardWithNewMove.move(currentBotMoveSuggestion.move.move)
    if (!successfulMove) {
      botConsole.error('The move the bot suggested is somehow invalid?!')
      return
    }

    const moveCount = chessboardWithNewMove.history().length
    // no matter which bot is selected, add a random wait time to every move
    const minMillisWaitTime = randomNumberBetween(2_000, 6_000)
    const maxMillisWaitTime = randomNumberBetween(10_000, 21_000)
    const isFirstFewMoves = moveCount <= randomNumberBetween(10, 20)
    const botWaitTimeInMillis = moveCount === 1 ? randomNumberBetween(1, 2_000) : 
      (isFirstFewMoves ? minMillisWaitTime : randomNumberBetween(minMillisWaitTime, maxMillisWaitTime))

    const moveEvent = JesterUtils.constructGameMoveEvent(
      botKeyPair.publicKey,
      currentWatchGameStartEvent.id,
      parentMoveId,
      chessboardWithNewMove
    )

    NostrEvents.signEvent(moveEvent, botKeyPair.privateKey)
      .then((signedEvent) => {
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
          }, botWaitTimeInMillis)
        })
      })
      .then((e) => {
        botConsole.info('[Bot] Sent event', e)
      })
      .catch((e) => {
        botConsole.error('[Bot] Could not send nostr event', e)
      })

    return () => {
      abortCtrl.abort()
    }
  }, [
    outgoingNostr,
    currentBotMoveSuggestion,
    currentChessInstance,
    botKeyPair,
    currentWatchGameStartEvent,
    currentGameHead,
  ])

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
