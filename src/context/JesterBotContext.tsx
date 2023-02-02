import { useState, createContext, useMemo, ProviderProps, useEffect, useRef } from 'react'
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

const VALIDATION_INSTANCE = new Chess.Chess()

const botConsole =
  process.env.NODE_ENV === 'development'
    ? console
    : {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      }
  
const instantiateBotByName = (botName: string | null): Nullable<SelectedBot> => {
  if (botName && Bot.Bots[botName]) {
    try {
      return {
        name: botName,
        bot: Bot.Bots[botName](),
      }
    } catch (e) {
      botConsole.error(`Could not instantiate bot '${botName}'`)
      return null
    }
  }
  return null
}

const randomBotWaitTime = (moveCount: number) => {
  const minMillisWaitTime = randomNumberBetween(1_000, 2_000)
  const maxMillisWaitTime = randomNumberBetween(minMillisWaitTime, minMillisWaitTime + 2_000)
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


type JesterBotProviderProps = {
  defaultBotName: keyof typeof Bot.Bots
}

const JesterBotProvider = ({ value: { defaultBotName }, children }: ProviderProps<JesterBotProviderProps>) => {
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
  const [watchGameId, setWatchGameId] = useState<NIP01.EventId>()
  const chessInstance = useRef<Chess.ChessInstance>()
  const [currentGameHead, setCurrentGameHead] = useState<GameMoveEvent>()

  const botMoveSuggestion = useBotSuggestion(selectedBot, currentGameHead)
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
      const newBot = instantiateBotByName(selectedBotName)
      return newBot ?? instantiateBotByName(defaultBotName)
    })
  }, [selectedBotName, defaultBotName])

  useEffect(() => {
    botConsole.debug(`[Bot] Bot changed to ${selectedBot?.name}`)
  }, [selectedBot])

  useEffect(() => {
    if (!selectedBot) return
    if (!botKeyPair) return
    if (!outgoingNostr) return
    if (!userPublicKeyOrNull) return
    if (allGamesCreatedByBot === null) return
    if (allGamesCreatedByBot.length !== 0) return

    botConsole.debug(`[Bot TODO] '${selectedBot.name}': I have not created any games..`)

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
    if (eligibleGamesForBot.length === 0) {
      setWatchGameId(undefined)
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
    if (!selectedBot || !watchGameId) return
    botConsole.info(`[Bot] '${selectedBot.name}': I have a purpose now - playing game ${watchGameId}`)
  }, [selectedBot, watchGameId])

  useEffect(() => {
    if (!selectedBot || !watchGameId) return
    botConsole.info(`[Bot] '${selectedBot.name}': Current head of ${watchGameId} is ${currentGameHead?.id}`)
  }, [selectedBot, watchGameId, currentGameHead])

  useEffect(() => {
    setCurrentGameHead((_) => {
      if (!currentWatchGameStartEvent || currentWatchGameMoves.length === 0) {
        return undefined
      }
      return currentWatchGameMoves[currentWatchGameMoves.length - 1]
    })
  }, [currentWatchGameStartEvent, currentWatchGameMoves])

  useEffect(() => {
    if (!currentGameHead) {
      chessInstance.current = new Chess.Chess()
      return
    }

    const content: JesterUtils.JesterProtoContent = JSON.parse(currentGameHead.content)

    const validPgn = VALIDATION_INSTANCE.load_pgn(content.pgn)
    if (!validPgn) {
      botConsole.error('[Bot] Current game head has no valid pgn')
      return
    }
    if (chessInstance.current === undefined) {
      botConsole.error('[Bot] Cannot load pgn - current instance not available. wtf?')
    } else {
      chessInstance.current!.load_pgn(content.pgn)
    }
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
    if (!chessInstance.current) return
    if (!botKeyPair) return
    if (!currentWatchGameStartEvent) return
    if (!currentBotMoveSuggestion || !currentBotMoveSuggestion.move) return

    const gameIsCreatedByBot = currentWatchGameStartEvent.pubkey === botKeyPair.publicKey
    const botColor = gameIsCreatedByBot ? 'w' : 'b'

    if (chessInstance.current.turn() !== botColor) {
      botConsole.debug('[Bot] Refrain from making a move - not my turn!')
      return
    }
    if (chessInstance.current.fen() !== currentBotMoveSuggestion.move.fen) {
      botConsole.debug('[Bot] Refrain from making a move - FEN does not match my suggestion!')
      return
    }

    const abortCtrl = new AbortController()
    const parentMoveId = currentGameHead?.id || currentWatchGameStartEvent.id
    const isGameStart = parentMoveId === currentWatchGameStartEvent.id

    const chessboardWithNewMove = new Chess.Chess()
    if (!isGameStart) {
      // load pgn does not work when the game has no moves - only load pgn if it is not game start!
      // TODO: but even then the second move will have the pgn empty.. so the error message is still logged
      if (!chessboardWithNewMove.load_pgn(chessInstance.current.pgn())) {
        botConsole.error('[Bot] The current chessboard is not valid.. wtf?')
        return
      }
    }
    const successfulMove = chessboardWithNewMove.move(currentBotMoveSuggestion.move.move)
    if (!successfulMove) {
      botConsole.error('[Bot] The move the bot suggested is somehow invalid?!')
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
  }, [outgoingNostr, currentBotMoveSuggestion, chessInstance, botKeyPair, currentWatchGameStartEvent, currentGameHead])

  return (
    <>
      <JesterBotContext.Provider value={{ bot: 'Default' }}>{children}</JesterBotContext.Provider>
    </>
  )
}

export { JesterBotContext, JesterBotProvider }
