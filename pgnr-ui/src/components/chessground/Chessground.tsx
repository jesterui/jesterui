import React, { useEffect, useState } from 'react'
import Chessground from '@react-chess/chessground'
import * as cg from 'chessground/types'
import { Config as CgConfig } from 'chessground/config'

// @ts-ignore
import { ChessInstance, Square } from '../ChessJsTypes'
import { arrayEquals } from '../../util/utils'

type MoveableColor = cg.Color[]
const moveableColorProp = (c: MoveableColor) => {
  if (c.length === 0) return undefined
  if (c.length === 1) return c[0]
  return 'both'
}

const findValidMoves = (chess: ChessInstance): Map<cg.Key, cg.Key[]> => {
  const dests = new Map()
  chess.SQUARES.forEach((square) => {
    const ms = chess.moves({ square, verbose: true })
    if (ms.length) {
      dests.set(
        square,
        ms.map((m) => m.to)
      )
    }
  })
  return dests
}

const StyledChessboard = ({
  game,
  userColor,
  config,
}: {
  config: Partial<CgConfig>
  game: ChessInstance
  userColor: MoveableColor
}) => {
  const [validMoves, setValidMoves] = useState<Map<cg.Key, cg.Key[]>>(new Map())

  useEffect(() => {
    console.debug('[Chess] Recalculating valid moves.. ')
    const newValidMoves = findValidMoves(game)
    console.debug(`[Chess] Number of moveable pieces: ${newValidMoves.size}`)
    setValidMoves(newValidMoves)
  }, [game])

  useEffect(() => {
    console.debug('[Chess] IN CHESSBOARD THINKS THE PGN IS', game.pgn())
  }, [game])

  const chessgroundConfig = {
    fen: game.fen(),
    turnColor: game.turn() === 'b' ? 'black' : 'white', // turn to play. white | black
    viewOnly: userColor.length === 0, // don't bind events: the user will never be able to move pieces around
    ...config,
    movable: {
      color: moveableColorProp(userColor),
      dests: config.movable?.dests || validMoves,
      free: false,
      ...config.movable,
    },
    /*highlight: {
      lastMove: true,
      check: true,
      ...config.highlight,
    },*/
  } as Partial<CgConfig>

  console.log('CHESSGROUND CONFIG:', chessgroundConfig)

  return (<>
      <div>{game.turn()} to turn</div>
      <div>{game.turn()} to turn</div>
      <Chessground
        contained={true}
        // For config, see: https://github.com/lichess-org/chessground/blob/master/src/config.ts#L7-L90
        config={chessgroundConfig}
      />
    </>
  )
}

export default function Chessboard({
  game,
  userColor,
  onAfterMoveFinished,
}: {
  game: ChessInstance
  userColor: MoveableColor
} & { onAfterMoveFinished: (fn: (g: ChessInstance) => void) => void }) {
  const onAfter = (orig: cg.Key, dest: cg.Key, metadata: cg.MoveMetadata) => {
    onAfterMoveFinished((g: ChessInstance) => {
      g.move({
        from: orig as Square,
        to: dest as Square,
        promotion: 'q', // always promote to a queen for example simplicity
      })
    })
  }

  return (
    <StyledChessboard
      game={game}
      userColor={userColor}
      config={{
        orientation: userColor.length === 1 ? userColor[0] : 'white',
        movable: {
          events: {
            after: onAfter,  // called after the move has been played
          },
        },
        events: {
          change: () => {}, // called after the situation changes on the board
          // called after a piece has been moved.
          // capturedPiece is undefined or like {color: 'white'; 'role': 'queen'}
          move: (orig: cg.Key, dest: cg.Key, capturedPiece?: cg.Piece) => {},
          dropNewPiece: (piece: cg.Piece, key: cg.Key) => {},
          select: (key: cg.Key) => {}, // called when a square is selected
          insert: (elements: cg.Elements) => {}, // when the board DOM has been (re)inserted
        }
      }}
    />
  )
}
