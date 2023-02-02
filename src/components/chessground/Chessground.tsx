import { useEffect, useCallback, useState } from 'react'
import Chessground from '@react-chess/chessground'
import * as cg from 'chessground/types'
import { Config as CgConfig } from 'chessground/config'

import { ChessInstance, Square, SQUARES } from 'chess.js'

type MoveableColor = cg.Color[]
const moveableColorProp = (c: MoveableColor) => {
  if (c.length === 0) return undefined
  if (c.length === 1) return c[0]
  return 'both'
}

const findValidMoves = (chess: ChessInstance): Map<cg.Key, cg.Key[]> => {
  const dests = new Map()
  SQUARES.forEach((square: Square) => {
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

type CgKeyPair = [cg.Key, cg.Key]

const findLastMove = (chess: ChessInstance): CgKeyPair | null => {
  const verboseHistory = chess.history({ verbose: true })
  const lastMoveOrNull = (verboseHistory.length > 0 && verboseHistory[verboseHistory.length - 1]) || null
  const lastMovePair = (lastMoveOrNull && ([lastMoveOrNull.from, lastMoveOrNull.to] as CgKeyPair)) || null
  return lastMovePair
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
  const [lastMove, setLastMove] = useState<CgKeyPair | null>(null)
  const [chessgroundConfig, setChessgroundConfig] = useState<Partial<CgConfig>>({} as Partial<CgConfig>)

  useEffect(() => {
    console.debug('[Chess] Recalculating valid moves.. ')
    const newValidMoves = findValidMoves(game)
    console.debug(`[Chess] Number of moveable pieces: ${newValidMoves.size}`)
    setValidMoves(newValidMoves)

    const newLastMove = findLastMove(game)
    console.debug(`[Chess] Found last move: ${newLastMove}`)
    setLastMove(newLastMove)
  }, [game])

  useEffect(() => {
    // For config, see: https://github.com/lichess-org/chessground/blob/master/src/config.ts#L7-L90
    setChessgroundConfig({
      fen: game.fen(),
      turnColor: game.turn() === 'b' ? 'black' : 'white', // turn to play. white | black
      viewOnly: userColor.length === 0 || game.game_over(), // don't bind events: the user will never be able to move pieces around
      lastMove: lastMove,
      ...config,
      movable: {
        color: moveableColorProp(userColor),
        dests: config.movable?.dests || validMoves,
        free: false,
        ...config.movable,
      },
      premovable: {
        ...config.premovable,
        enabled: false, // "premoves" are currently not supported
      },
      highlight: {
        lastMove: true,
        check: true,
        ...config.highlight,
      },
    } as Partial<CgConfig>)
  }, [game, lastMove, validMoves, config, userColor])

  return (
    <>
      <Chessground contained={true} config={chessgroundConfig} />
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
  const [chessgroundConfig, setChessgroundConfig] = useState<Partial<CgConfig>>({} as Partial<CgConfig>)

  const onAfter = useCallback(
    (orig: cg.Key, dest: cg.Key, metadata: cg.MoveMetadata) => {
      onAfterMoveFinished((g: ChessInstance) => {
        g.move({
          from: orig as Square,
          to: dest as Square,
          promotion: 'q', // always promote to a queen for example simplicity
        })
      })
    },
    [onAfterMoveFinished]
  )

  useEffect(() => {
    // For config, see: https://github.com/lichess-org/chessground/blob/master/src/config.ts#L7-L90
    setChessgroundConfig({
      orientation: userColor.length === 1 ? userColor[0] : 'white',
      movable: {
        events: {
          after: onAfter, // called after the move has been played
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
      },
    } as Partial<CgConfig>)
  }, [userColor, onAfter])

  return <StyledChessboard game={game} userColor={userColor} config={chessgroundConfig} />
}
