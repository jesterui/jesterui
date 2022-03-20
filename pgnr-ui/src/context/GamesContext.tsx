import React, { createContext, useState, useContext, PropsWithChildren } from 'react'

import { getSession } from '../util/session'

// @ts-ignore
import Chess from 'chess.js';
import { ChessInstance, Square } from '../components/ChessJsTypes'
import * as cg from 'chessground/types';

type MoveableColor = [] | ['white'] | ['black'] | ['white', 'black']

export type Game = { 
  game: ChessInstance
  color: MoveableColor
}
type Games = Game[]

interface GamesContextEntry {
  games: Games
  currentGame: Game | null
  setCurrentGame: (fn: (game: Game | null) => Game | null) => void
}

const GamesContext = createContext<GamesContextEntry | undefined>(undefined)

const GamesProvider = ({children } : React.ProviderProps<GamesContextEntry | undefined>) => {
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [games, setGames] = useState<Games>([])

  return (
    <GamesContext.Provider value={{currentGame, setCurrentGame, games}}>
      {children}
    </GamesContext.Provider>
  )
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


export {
  GamesContext,
  GamesProvider,
  useCurrentGame,
  useSetCurrentGame
}