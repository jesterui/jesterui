import React, { useEffect, useState } from 'react'
import Chessground from '@react-chess/chessground'
import * as cg from 'chessground/types';
import { Config as CgConfig } from 'chessground/config';

// @ts-ignore
import Chess from 'chess.js';
import { ChessInstance, Square } from './ChessJsTypes'

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
 
type PgnLine = { no: number, white: cg.Key, black?: cg.Key}

function StyledPgn({ game }: { game: ChessInstance }) {
  const [pgn, setPgn] = useState<string>('');
  const [lines, setLines] = useState<PgnLine[]>([]);

  useEffect(() => {
    setPgn(game.pgn({
      max_width: 2,
      newline_char: '|'
    }))
  }, [game])

  useEffect(() => {
    const parsed = !pgn? [] : pgn.split('|').map((line) => {
      const split = line.split(' ')
      return {
        no: parseInt(split[0], 10),
        white: split[1] as cg.Key,
        black: split[2] as cg.Key || undefined
      } 
    })
    setLines(parsed)
  }, [pgn])


  return (<div style={{ width: '100px' }}>
    <div>
      {lines.map((line, index) => {
        return (<div key={index}>{line.no}, {line.white}, {line.black}</div>)
      })}
    </div>
  </div>)
}

function StyledAscii({ game }: { game: ChessInstance }) {
  const [ascii, setAscii] = useState<string>(game.ascii());
  const [lines, setLines] = useState<Array<string>>([]);

  useEffect(() => {
    setAscii(game.ascii())
  }, [game])

  useEffect(() => {
    setLines(ascii.match(/(.{1,32})/g) || [])
  }, [ascii])


  return (<div>
    <pre>
      {lines.map((line, index) => {
        return (<div key={index}>{line}</div>)
      })}
    </pre>
  </div>)
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
  <div style={{ display: 'flex' }}>
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
    <StyledPgn game={game} />
  </div>
  <div>
  <StyledAscii game={game} />
  </div>
  </div>
  )
}
