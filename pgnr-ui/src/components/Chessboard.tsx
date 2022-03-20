import React, { useEffect, useState, useRef } from 'react'
import { Chessboard as ReactChessboard } from 'react-chessboard'
// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance, Square, Move } from './ChessJsTypes'

type OnPieceDrop = (sourceSquare: Square, targetSquare: Square) => boolean

interface SquareStyle {
  background?: string
  borderRadius?: string
  backgroundColor?: string
}

type SquareStyles = {
  [propName in Square]?: SquareStyle
}

const findValidMoves = (game: ChessInstance, square: Square): Move[] => {
  return game.moves({ square, verbose: true })
}

const validMovesToSquareStyles = (game: ChessInstance, square: Square, moves: Move[]) => {
  const styles: SquareStyles = {}
  if (moves.length !== 0) {
    styles[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    }
  }

  const moveStyles: SquareStyles[] = moves.map((move) => {
    const sourcePiece = game.get(square)
    const targetPiece = game.get(move.to)
    const challengesTargetPiece = targetPiece && targetPiece.color !== sourcePiece?.color
    const highlightCircleRadius = challengesTargetPiece ? 85 : 25

    return {
      [move.to]: {
        background: `radial-gradient(circle, rgba(0, 0, 0, .1) ${highlightCircleRadius}%, transparent ${highlightCircleRadius}%)`,
        borderRadius: '50%',
      },
    }
  })

  return moveStyles.reduce((acc, obj) => ({ ...acc, ...obj }), styles)
}

function StyledChessboard({
  position,
  onPieceDrop,
  latestMove,
}: {
  position: string
  onPieceDrop: OnPieceDrop
  latestMove: Move | null
}) {
  const chessboardRef = useRef<HTMLDivElement>(null)
  const [game, setGame] = useState<ChessInstance>(new Chess(position))

  const [rightClickedSquares, setRightClickedSquares] = useState<SquareStyles>({})
  const [moveSquares, setMoveSquares] = useState<SquareStyles>({})
  const [optionSquares, setOptionSquares] = useState<SquareStyles>({})

  function onMouseOverSquare(square: Square) {
    const validMoves = findValidMoves(game, square)
    const optionsSquares = validMovesToSquareStyles(game, square, validMoves)
    setOptionSquares(optionsSquares)
  }

  function onMouseOutSquare() {
    // Only set squares to {} if not already set to {}
    if (Object.keys(optionSquares).length !== 0) {
      setOptionSquares({})
    }
  }

  function onSquareClick() {
    setRightClickedSquares({})
  }

  function onSquareRightClick(square: Square) {
    const color = 'rgba(0, 0, 255, 0.4)'
    const isAlreadyColored = rightClickedSquares[square] && rightClickedSquares[square]?.backgroundColor === color
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]: isAlreadyColored
        ? undefined
        : {
            backgroundColor: color,
          },
    })
  }

  useEffect(() => {
    setGame((g) => {
      g.load(position)
      return g
    })
  }, [position])

  useEffect(() => {
    latestMove &&
      setMoveSquares({
        [latestMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
        [latestMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
      })
  }, [latestMove])

  return (
    <div>
      <ReactChessboard
        ref={chessboardRef}
        position={game.fen()}
        showBoardNotation={true}
        arePremovesAllowed={false}
        onPieceDrop={onPieceDrop}
        onMouseOverSquare={onMouseOverSquare}
        onMouseOutSquare={onMouseOutSquare}
        onSquareClick={onSquareClick}
        onSquareRightClick={onSquareRightClick}
        customBoardStyle={{
          borderRadius: '4px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        }}
        customSquareStyles={{
          ...moveSquares,
          ...optionSquares,
          ...rightClickedSquares,
        }}
      />
    </div>
  )
}

export default function Chessboard() {
  const [game, setGame] = useState<ChessInstance>(new Chess())
  const [latestMove, setLatestMove] = useState<Move | null>(null)

  function safeGameMutate(modify: (foo: ChessInstance) => void) {
    setGame((g: ChessInstance) => {
      const update = { ...g }
      modify(update)
      return update
    })
  }

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    let move: Move | null = null
    safeGameMutate((game) => {
      move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to a queen for example simplicity
      })
    })
    const isValidMove = move !== null
    if (isValidMove) {
      setLatestMove(move)
    }
    return isValidMove
  }

  return (
    <div>
      <StyledChessboard position={game.fen()} latestMove={latestMove} onPieceDrop={onDrop} />
    </div>
  )
}
