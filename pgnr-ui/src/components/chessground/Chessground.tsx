import React, {  useState } from 'react'
import Chessground from '@react-chess/chessground'
import * as cg from 'chessground/types';
import { Config as CgConfig } from 'chessground/config';
import PgnTable from './PgnTable'

// @ts-ignore
import Chess from 'chess.js';
import { ChessInstance, Square } from '../ChessJsTypes'

const findValidMoves = (chess: ChessInstance): Map<cg.Key, cg.Key[]> => {
  const dests = new Map()
  chess.SQUARES.forEach(square => {
    const ms = chess.moves({square, verbose: true})
    if (ms.length) {
      dests.set(square, ms.map(m => m.to))
    }
  })
  return dests
}

const StyledChessboard = ({ config }: { config: CgConfig & { game: ChessInstance, userColor: cg.Color | undefined } }) => {
  return (
    <Chessground 
      contained={true}
      config={{
        fen: config.fen || config.game.fen(),
        viewOnly: config.userColor === undefined,
        orientation: config.userColor || 'white',
        ...config,
        movable: {
          color: config.userColor,
          dests: config.movable?.dests || findValidMoves(config.game),
          free: false,
          ...config.movable,
        },
        highlight: {
          lastMove: true,
          check: true,
          ...config.highlight,
        }
      }} 
    />
  )
}

export default function Chessboard({ onChange } : { onChange?: () => void }) {
  const userColor = useState<cg.Color>(['white', 'black'][Math.floor(Math.random() * 2)] as cg.Color)[0];
  const [game, setGame] = useState<ChessInstance>(new Chess());
   
  function safeGameMutate(modify: (foo: ChessInstance) => void) {
    setGame((g: ChessInstance) => {
      const update = { ...g };
      modify(update);
      return update;
    });
    onChange && onChange()
  }

  const onAfter = (orig: cg.Key, dest: cg.Key, metadata: cg.MoveMetadata) => {
    safeGameMutate((game) => {
      game.move({
        from: orig as Square,
        to: dest as Square,
        promotion: 'q', // always promote to a queen for example simplicity
      })
    })
  }

  return (
    <div>
  <div style={{ display: 'flex', maxHeight: 600 }}>
    <div style={{ width: 600, height: 600 }}>
      <StyledChessboard config={{
        game, 
        userColor, 
        movable: {
          color: 'both',
          events: {
            after: onAfter
          }
        }
      }} />
    </div>
    <div className="pl-2 overflow-y-scroll">
      <PgnTable game={game} />
    </div>
  </div>
  </div>
  )
}
