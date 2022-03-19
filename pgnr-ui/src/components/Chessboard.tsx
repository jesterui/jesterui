import React, { useState } from 'react'
import { Chessboard as ReactChessboard } from 'react-chessboard'
// @ts-ignore
import Chess from 'chess.js';

export default function Chessboard() {
 const [game, setGame] = useState(new Chess());
   

  function safeGameMutate(modify: (foo: any/*Chess.ChessInstance*/) => void) {
    setGame((g: any/*Chess.ChessInstance*/) => {
      const update = { ...g };
      modify(update);
      return update;
    });
  }

  const onDrop = (sourceSquare: any/*Chess.Square*/, targetSquare: any/*Chess.Square*/) => {
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
      <ReactChessboard id={1}  position={game.fen()} onPieceDrop={onDrop} />
    </div>
  )
}
