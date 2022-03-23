import React, { useEffect, useState } from 'react'
import Chessground from '@react-chess/chessground'
import * as cg from 'chessground/types'
import { Config as CgConfig } from 'chessground/config'

// @ts-ignore
import { ChessInstance, Square } from '../ChessJsTypes'

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
  config: CgConfig
  game: ChessInstance
  userColor: MoveableColor
}) => {
  const [validMoves, setValidMoves] = useState<Map<cg.Key, cg.Key[]>>(new Map())

  useEffect(() => {
    console.debug('[Chess] Recalculating valid moves..')
    setValidMoves(findValidMoves(game))
  }, [game])

  return (
    <Chessground
      contained={true}
      config={{
        fen: config.fen || game.fen(),
        viewOnly: userColor.length === 0,
        orientation: userColor.length === 1 ? userColor[0] : 'white',
        ...config,
        movable: {
          color: moveableColorProp(userColor),
          dests: config.movable?.dests || validMoves,
          free: false,
          ...config.movable,
        },
        highlight: {
          lastMove: true,
          check: true,
          ...config.highlight,
        },
      }}
    />
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
        movable: {
          events: {
            after: onAfter,
          },
        },
      }}
    />
  )
}
