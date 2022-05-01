import React, { createContext, useContext, ProviderProps, useEffect } from 'react'
import { NostrEvent } from '../util/nostr_db'
import { AppDexie, db } from '../util/app_db'
import { IndexableType, Transaction } from 'dexie'
import { useNostrStore } from '../context/NostrStoreContext'
import * as AppUtils from '../util/pgnrui'

interface GameEventStoreEntry {
  db: AppDexie
}

const GameEventStoreContext = createContext<GameEventStoreEntry | undefined>(undefined)

const GameEventStoreProvider = ({ children }: ProviderProps<GameEventStoreEntry | undefined>) => {
  const NostrDb = useNostrStore()

  useEffect(() => {
    const hook = async (primKey: IndexableType, entry: NostrEvent, trans: Transaction) => {
      if (AppUtils.isStartGameEvent(entry)) {
        try {
          const id = await db.game_start.put(entry)
          console.debug(`insert new game_start entry ${id}`)
        } catch(e) { 
          throw new Error('Could not insert game_start entry')
        }
      }
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
