import { useState, createContext, useContext, useMemo, ProviderProps, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { useSettings } from '../context/SettingsContext'
import { useOutgoingNostrEvents } from '../context/NostrEventsContext'
import { useGameStore } from '../context/GameEventStoreContext'

import useBotSuggestion from '../hooks/BotMoveSuggestion'

import { SelectedBot } from '../components/BotSelector'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as JesterUtils from '../util/jester'
import { GameMoveEvent } from '../util/app_db'
import { KeyPair, createPersonalBotKeyPair, randomNumberBetween } from '../util/app'
import { getSession } from '../util/session'
import * as Bot from '../util/bot'

import * as Chess from 'chess.js'

const botConsole =
  process.env.NODE_ENV === 'development'
    ? console
    : {
        debug: () => {},
        info: () => {},
        error: () => {},
      }

const DEFAULT_BOT_NAME = 'Risky Alice'
const createDefaultBot: () => SelectedBot | null = () =>
  ((name) => {
    try {
      return {
        name: name,
        bot: Bot.Bots[name](),
      }
    } catch (e) {
      botConsole.error(`Could not instantiate bot '${name}'`)
      return null
    }
  })(DEFAULT_BOT_NAME)

const instantiateBotByName = (botName: string | null): SelectedBot | null => {
  if (botName && Bot.Bots[botName]) {
    return {
      name: botName,
      bot: Bot.Bots[botName](),
    }
  }
  return createDefaultBot()
}

const randomBotWaitTime = (moveCount: number) => {
  const minMillisWaitTime = randomNumberBetween(2_000, 6_000)
  const maxMillisWaitTime = randomNumberBetween(10_000, 15_000)
  const isFirstFewMoves = moveCount <= randomNumberBetween(10, 20)
  return moveCount <= 1
    ? 4
    : isFirstFewMoves
    ? randomNumberBetween(4, minMillisWaitTime)
    : randomNumberBetween(minMillisWaitTime, maxMillisWaitTime)
}

interface JesterBotContextEntry {
  bot: string
}

const JesterBotContext = createContext<JesterBotContextEntry | undefined>(undefined)

// TODO: currently, the bot can only move for white
const JesterBotProvider = ({ children }: ProviderProps<JesterBotContextEntry | undefined>) => {
  const settings = useSettings()
  const gameStore = useGameStore()
  const outgoingNostr = useOutgoingNostrEvents()

  const userPublicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const userPrivateKeyOrNull = getSession()?.privateKey || null

  const botKeyPair = useMemo<KeyPair | null>(() => {
    return userPrivateKeyOrNull ? createPersonalBotKeyPair(userPrivateKeyOrNull) : null
  }, [userPrivateKeyOrNull])

  const privateStartGameRef: NIP01.EventId | null = useMemo(
    () => botKeyPair && JesterUtils.jesterPrivateStartGameRef(botKeyPair.publicKey),
    [botKeyPair]
  )

  const currentGameJesterId = useMemo(() => settings.currentGameJesterId, [settings])
  const selectedBotName = useMemo(() => settings.botName, [settings])

  const [selectedBot, setSelectedBot] = useState<SelectedBot | null>(null)
  const [watchGameId, setWatchGameId] = useState<NIP01.EventId | null>(null)
  const [currentChessInstance, setCurrentChessInstance] = useState<Chess.ChessInstance | null>(null)
  const [currentGameHead, setCurrentGameHead] = useState<GameMoveEvent | null>(null)

  const botMoveSuggestion = useBotSuggestion(selectedBot, currentChessInstance)
  const [currentBotMoveSuggestion, setCurrentBotMoveSuggestion] = useState(botMoveSuggestion)

  const allGamesCreatedByBot = useLiveQuery(
    async () => {
      if (!botKeyPair) {
        return null
      }

      // TODO: filter for stopped games (e.g. game_over) => should this be added to the game event db?
      // TODO: This will only ever generate one bot game per identity..
      const gameStartEventsCreatedByBot = await gameStore.game_start
        .where('pubkey')
        .equals(botKeyPair.publicKey)
        .sortBy('created_at')

      return gameStartEventsCreatedByBot
    },
    [botKeyPair],
    null
  )

  const allDirectChallengesForBot = useLiveQuery(
    async () => {
      if (!privateStartGameRef) return null
      const events = await gameStore.game_start.where('event_tags').equals(privateStartGameRef).toArray()

      return events
    },
    [privateStartGameRef],
    null
  )

  const eligibleGamesForBot = useMemo(() => {
    return [...(allGamesCreatedByBot || []), ...(allDirectChallengesForBot || [])]
  }, [allGamesCreatedByBot, allDirectChallengesForBot])

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
      if (current) {
        if (current.name === selectedBotName) {
          return current
        }
        // terminate the bot if not already happened
        if (!current.bot.isTerminated()) {
          current.bot.terminate()
        }
      }
      return instantiateBotByName(selectedBotName)
    })
  }, [selectedBotName])

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

    botConsole.debug(`[Bot TODO] '${selectedBot?.name}': I have not created any games..`)

    try {
      const signedEvent = NostrEvents.signEvent(
        JesterUtils.constructPrivateStartGameEvent(botKeyPair.publicKey, userPublicKeyOrNull),
        botKeyPair.privateKey
      )
      outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
      botConsole.info('[Bot] Sent event via nostr..', signedEvent.id)

      setWatchGameId(signedEvent.id)
    } catch (e) {
      botConsole.error('[Bot] Error while sending start event..', e)
    }
  }, [selectedBot, allGamesCreatedByBot, userPublicKeyOrNull, botKeyPair, outgoingNostr])

  useEffect(() => {
    if (eligibleGamesForBot === null || eligibleGamesForBot.length === 0) {
      setWatchGameId(null)
      return
    }

    setWatchGameId((current) => {
      if (!currentGameJesterId) {
        return current
      }
      const currentGameId = JesterUtils.jesterIdToGameId(currentGameJesterId)
      if (current === currentGameId) {
        return current
      }

      const matchingGames = eligibleGamesForBot.filter((it) => it.id === currentGameId)
      const matchingGame = matchingGames.length > 0 ? matchingGames[0] : null
      if (matchingGame !== null) {
        return matchingGame.id
      }
      return current
    })
  }, [currentGameJesterId, eligibleGamesForBot])

  useEffect(() => {
    if (!watchGameId) return
    if (!selectedBot) return

    botConsole.info(`[Bot] '${selectedBot.name}': I have a purpose now - playing game ${watchGameId}`)
  }, [selectedBot, watchGameId])

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

    const validPgn = chessInstance.load_pgn(content.pgn)
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

    const gameIsCreatedByBot = currentWatchGameStartEvent.pubkey === botKeyPair.publicKey
    const botColor = gameIsCreatedByBot ? 'w' : 'b'

    if (currentChessInstance.turn() !== botColor) return
    if (currentChessInstance.fen() !== currentBotMoveSuggestion.move.fen) return

    const abortCtrl = new AbortController()
    const parentMoveId = currentGameHead?.id || currentWatchGameStartEvent.id
    const isGameStart = parentMoveId === currentWatchGameStartEvent.id

    const chessboardWithNewMove = new Chess.Chess()
    if (!isGameStart) {
      // load pgn does not work when the game has no moves - only load pgn if it is not game start!
      // TODO: but even then the second move will have the pgn empty.. so the error message is still logged
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
    const botWaitTimeInMillis = randomBotWaitTime(moveCount)

    const moveEvent = JesterUtils.constructGameMoveEvent(
      botKeyPair.publicKey,
      currentWatchGameStartEvent.id,
      parentMoveId,
      chessboardWithNewMove
    )

    const signedEvent = NostrEvents.signEvent(moveEvent, botKeyPair.privateKey)

    new Promise<NIP01.Event>(function (resolve, reject) {
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
