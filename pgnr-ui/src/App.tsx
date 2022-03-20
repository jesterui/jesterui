import React, { useEffect } from 'react'
import './App.css'
import AppNavbar from './components/AppNavbar'
import Settings from './components/Settings'
import Layout from './Layout'

import { useCurrentGame, useSetCurrentGame } from './context/GamesContext'
import Chessboard from './components/chessground/Chessground'
import PgnTable from './components/chessground/PgnTable'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance } from './components/ChessJsTypes'
import * as cg from 'chessground/types'
import { Route, Routes, Navigate } from 'react-router-dom'

function BoardContainer() {
  const game = useCurrentGame()
  const setCurrentGame = useSetCurrentGame()

  useEffect(() => {
    setCurrentGame((currentGame) => {
      if (currentGame) return currentGame

      const color = ['white', 'black'][Math.floor(Math.random() * 2)] as cg.Color
      return {
        game: new Chess(),
        color: ['white', 'black'] || [color], // TODO: currently make it possible to move both colors
      }
    })
  }, [setCurrentGame])

  const updateGame = (modify: (g: ChessInstance) => void) => {
    console.debug('onUpdateGame invoked')
    setCurrentGame((currentGame) => {
      if (!currentGame) return null
      const update = { ...currentGame.game }
      modify(update)
      return { ...currentGame, game: update }
    })
  }

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: 400, height: 400 }}>
        {game && <Chessboard game={game!.game} userColor={game!.color} updateGame={updateGame} />}
      </div>
      {game && (
        <div className="pl-2 overflow-y-scroll">
          <PgnTable game={game!.game} />
        </div>
      )}
    </div>
  )
}

function Index() {
  return (
    <div className="screen-index">
      <Heading1 color="blueGray">Gameboard</Heading1>
      <BoardContainer />
    </div>
  )
}

export default function App() {
  return (
    <div className="App">
      <header className="App-header w-full">
        <AppNavbar />
      </header>
      <section className="App-container">
        <Routes>
          <Route element={<Layout variant={null} />}>
            <Route path="/" element={<Index />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace={true} />} />
          </Route>
        </Routes>
      </section>
      <footer className="App-footer">
        <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </footer>
    </div>
  )
}
