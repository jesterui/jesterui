import React, { RefObject, useEffect, useState, useRef } from 'react'
import { Chessboard as ReactChessboard } from 'react-chessboard'
// @ts-ignore
import Chess from 'chess.js';
import { ChessInstance, Square, Move, } from './ChessJsTypes'


type OnPieceDrop = (sourceSquare: Square, targetSquare: Square) => boolean


interface SquareStyle { 
  background: string, 
  borderRadius?: string
}

type MoveStyleEntry = {
  
}
type SquareStyles = {
  [propName in Square]? : SquareStyle
}

const findValidMoves = (game: ChessInstance, square: Square): Move[] => {
  return game.moves({ square, verbose: true });
}

const validMovesToSquareStyles = (game: ChessInstance, square: Square, moves: Move[]) => {
  const styles: SquareStyles = {}
  if (moves.length !== 0) {
    styles[square] = { 
      background: 'rgba(255, 255, 0, 0.4)' 
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
        borderRadius: '50%'
      }
    }
  })

  return moveStyles.reduce((acc, obj) => ({...acc, ...obj}), styles)
}

function StyledChessboard({ position, onPieceDrop}: { position: string, onPieceDrop: OnPieceDrop}) {
  const chessboardRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<ChessInstance>(new Chess(position));

  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [moveSquares, setMoveSquares] = useState({});
  const [optionSquares, setOptionSquares] = useState<SquareStyles>({});

  function onMouseOverSquare(square: Square) {
    const validMoves = findValidMoves(game, square);
    const optionsSquares = validMovesToSquareStyles(game, square, validMoves)
    setOptionSquares(optionsSquares);
  }

  // Only set squares to {} if not already set to {}
  function onMouseOutSquare() {
    if (Object.keys(optionSquares).length !== 0) {
      setOptionSquares({})
    }
  }

  useEffect(() => {
    setGame(new Chess(position))
  }, [position])

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

          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
          }}
          customSquareStyles={{
            ...moveSquares,
            ...optionSquares,
            ...rightClickedSquares
          }}
        />
     </div>
   )
 }
 

export default function Chessboard() {
 const [game, setGame] = useState(new Chess());
   

  function safeGameMutate(modify: (foo: ChessInstance) => void) {
    setGame((g: ChessInstance) => {
      const update = { ...g };
      modify(update);
      return update;
    });
  }

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    let move = null;
    safeGameMutate((game) => {
      move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // always promote to a queen for example simplicity
      });
    });
    return move !== null;
  }

  return (
    <div>
      <StyledChessboard position={game.fen()} onPieceDrop={onDrop} />
    </div>
  )
}
