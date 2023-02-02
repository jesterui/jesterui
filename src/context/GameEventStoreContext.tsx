import { createContext, useContext, ProviderProps, useEffect } from 'react'
import { IndexableType, Transaction } from 'dexie'

import { useNostrStore } from '../context/NostrStoreContext'

import * as JesterUtils from '../util/jester'
import * as NIP01 from '../util/nostr/nip01'
import { NostrEvent } from '../util/nostr_db'
import { AppDexie, db, GameMoveEvent, GameStartEvent } from '../util/app_db'
import { arrayEquals } from '../util/utils'

import * as Chess from 'chess.js'

const _chessInstance: Chess.Chess = new Chess.Chess()

const isValidSuccessor = (parent: GameStartEvent | GameMoveEvent, event: NIP01.Event) => {
  const content = JSON.parse(event.content) as JesterUtils.JesterProtoContent
  if (!content.pgn) {
    return false
  }

  try {
    _chessInstance.loadPgn(content.pgn)
  } catch (e) {
    return false
  }

  const childHistory = _chessInstance.history()

  const parentContent = JSON.parse(parent.content) as JesterUtils.JesterProtoContent
  try {
    _chessInstance.loadPgn(parentContent.pgn)
  } catch (e) {
    return false
  }
  const parentHistory = _chessInstance.history()

  if (!arrayEquals(parentHistory, childHistory.slice(0, childHistory.length - 1))) {
    return false
  }

  return true
}

interface GameEventStoreEntry {
  db: AppDexie
}

const GameEventStoreContext = createContext<GameEventStoreEntry | undefined>(undefined)

const GameEventStoreProvider = ({ children }: ProviderProps<GameEventStoreEntry | undefined>) => {
  const NostrDb = useNostrStore()

  useEffect(() => {
    const hook = async (primKey: IndexableType, entry: NostrEvent, trans: Transaction) => {
      if (JesterUtils.isStartGameEvent(entry)) {
        trans.on('complete', async () => {
          const additionalEventTags = (entry.tags || [])
            .filter((t) => t[0] === NIP01.TagEnum.e)
            .map((t) => t[1] as NIP01.EventId)
            .filter((t) => t !== JesterUtils.JESTER_START_GAME_E_REF)

          const entity = {
            ...entry,
            event_tags: additionalEventTags,
          }

          try {
            const id = await db.game_start.put(entity)
            console.debug(`insert new game_start entry ${id}`)
          } catch (e) {
            console.debug('error while adding game_start - might already exist')
          }
        })
      }
    }

    NostrDb.nostr_events.hook('creating', hook)

    return () => {
      NostrDb.nostr_events.hook('creating').unsubscribe(hook)
    }
  }, [NostrDb])

  useEffect(() => {
    const hook = async (primKey: IndexableType, entry: NostrEvent, trans: Transaction) => {
      const eventRefs: NIP01.EventId[] = (entry.tags || [])
        .filter((t) => t[0] === NIP01.TagEnum.e)
        .map((t) => t[1] as NIP01.EventId)

      const possibleGameId = eventRefs[0]
      if (JesterUtils.isGameChatEvent(possibleGameId, entry)) {
        trans.on('complete', async () => {
          const entity = {
            ...entry,
            gameId: possibleGameId,
          }

          try {
            const id = await db.game_chat.put(entity)
            console.debug(`insert new game_chat entry ${id}`)
          } catch (e) {
            console.debug('error while adding game_chat - might already exist')
          }
        })
      }
    }

    NostrDb.nostr_events.hook('creating', hook)

    return () => {
      NostrDb.nostr_events.hook('creating').unsubscribe(hook)
    }
  }, [NostrDb])

  useEffect(() => {
    const hook = async (primKey: IndexableType, entry: NostrEvent, trans: Transaction) => {
      const looksLikeMoveEvent = JesterUtils.mightBeMoveGameEvent(entry)
      if (!looksLikeMoveEvent) {
        console.debug(`[EventStore] Decline storage of game_move entry ${entry.id}: not a move event`)
        return
      }

      const eventRootTags = entry.tags
        .filter((t) => t[0] === NIP01.TagEnum.e)
        .filter((t) => t[3] === 'root')
        .map((t) => t[1] as NIP01.EventId)

      const eventReplyTags = entry.tags
        .filter((t) => t[0] === NIP01.TagEnum.e)
        .filter((t) => t[3] === 'reply')
        .map((t) => t[1] as NIP01.EventId)

      const possibleStartEventId = eventRootTags[0]
      const possiblePreviousMoveEventId = eventReplyTags[0]
      const isInitialMove = possiblePreviousMoveEventId === possibleStartEventId

      // TODO: currently the events arrive out of order.. so there might not be something to validate..
      // even the start game, as well as a possible "parent move", may not be present..
      // e.g. when an old game is loaded
      /*const gameStartEventOrNull = await db.game_start.get(possibleStartEventId)
      .then((val) =>  val !== undefined ? val : null)
      .catch(() => null)

      if (gameStartEventOrNull === null) return

      if (!isInitialMove) { 
        const previousMoveEventOrNull: GameStartEvent | GameMoveEvent = isInitialMove ? gameStartEventOrNull : (await db.game_move.get(possiblePreviousMoveEventId)
          .then((val) =>  val !== undefined ? val : null)
          .catch(() => null))
        if (previousMoveEventOrNull === null) return

        const isValid = isValidSuccessor(previousMoveEventOrNull, entry)
        if (!isValid) return
      }*/

      // TODO: check if previous move does not have already a move event
      // is this really necessary? We can handle multiple heads -> just take the first
      // await findReferencingEvents(previousMoveEventOrNull.id)

      trans.on('complete', async () => {
        const content = JSON.parse(entry.content) as JesterUtils.JesterProtoContent
        try {
          _chessInstance.loadPgn(content.pgn)
        } catch (e) {
          console.warn(`[EventStore] Decline storage of game_move entry ${entry.id}: illegal pgn`)
          return
        }

        const moveCounter = _chessInstance.history().length

        await db.game_move
          .add({
            ...entry,
            gameId: possibleStartEventId,
            moveCounter,
            parentMoveId: isInitialMove ? null : possiblePreviousMoveEventId,
          })
          .then((val) => val !== undefined)
          .catch(() => false)
      })
    }

    NostrDb.nostr_events.hook('creating', hook)

    return () => {
      NostrDb.nostr_events.hook('creating').unsubscribe(hook)
    }
  }, [NostrDb])

  return (
    <>
      <GameEventStoreContext.Provider value={{ db }}>{children}</GameEventStoreContext.Provider>
    </>
  )
}

const useGameStore = () => {
  const context = useContext(GameEventStoreContext)
  if (context === undefined) {
    throw new Error('useGameStore must be used within a GameEventStoreProvider')
  }

  return context.db
}

export { GameEventStoreContext, GameEventStoreProvider, useGameStore }
