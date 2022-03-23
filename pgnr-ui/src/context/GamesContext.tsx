import React, { createContext, useState, useContext, ProviderProps } from 'react'

// @ts-ignore
import { ChessInstance } from '../components/ChessJsTypes'
import * as cg from 'chessground/types'

type MovebleColor = [] | [cg.Color] | ['white', 'black']

export type Game = {
  game: ChessInstance
  color: MovebleColor
}
type Games = Game[]

interface GamesContextEntry {
  games: Games
  currentGame: Game | null
  setCurrentGame: (fn: (game: Game | null) => Game | null) => void
}

const GamesContext = createContext<GamesContextEntry | undefined>(undefined)

const GamesProvider = ({ children }: ProviderProps<GamesContextEntry | undefined>) => {
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [games] = useState<Games>([])

  return <GamesContext.Provider value={{ currentGame, setCurrentGame, games }}>{children}</GamesContext.Provider>
}

const useCurrentGame = () => {
  const context = useContext(GamesContext)
  if (context === undefined) {
    throw new Error('useCurrentGame must be used within a GamesProvider')
  }

  return context.currentGame
}
const useSetCurrentGame = () => {
  const context = useContext(GamesContext)
  if (context === undefined) {
    throw new Error('useSetCurrentGame must be used within a GamesProvider')
  }

  return context.setCurrentGame
}

export { GamesContext, GamesProvider, useCurrentGame, useSetCurrentGame }
