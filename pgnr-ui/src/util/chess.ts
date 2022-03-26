// @ts-ignore
import Chess from 'chess.js'
import { ChessInstance, Move } from '../components/ChessJsTypes'

export type Fen = string

export interface ValidFen {
  value(): Fen
  validMoves(): ValidMoves
}

export interface ValidMoves {
  source(): ValidFen
  values(): ValidMove[]
  contains(fen: ValidFen): boolean
}

export interface ValidMove {
  value(): Move
  source(): ValidFen
  target(): ValidFen
}

class ValidMovesImpl implements ValidMoves {
  private _source: ValidFen
  private _validMoves: ValidMove[]
  constructor(source: ValidFen) {
    this._source = source

    const validSuccessors: [Move, ValidFen][] = findValidSuccesors(this._source)
    this._validMoves = validSuccessors.map((moveAndFen) => ({
      value: () => moveAndFen[0],
      source: () => this._source,
      target: () => moveAndFen[1],
    }))
  }
  source() {
    return this._source
  }
  values() {
    return this._validMoves
  }
  contains(fen: ValidFen): boolean {
    const validMoveFens = this._validMoves.map((it) => it.target().value())
    return validMoveFens.includes(fen.value())
  }
}

class ValidFenImpl implements ValidFen {
  private _fen: Fen
  constructor(fen: Fen) {
    if (!isValidFen(fen)) {
      throw new Error('Cannot create ValidFen from invalid fen string')
    }
    this._fen = fen
  }
  value() {
    return this._fen
  }
  validMoves(): ValidMoves {
    return new ValidMovesImpl(this)
  }
}

const _chessInstance: ChessInstance = new Chess()

const _withFen = (fen: ValidFen): ChessInstance => {
  const fenLoaded = _chessInstance.load(fen.value())
  if (!fenLoaded) {
    throw new Error('Could not load fen')
  }
  return _chessInstance
}

const isValidFen = (fen: Fen): boolean => {
  return _chessInstance.validate_fen(fen).valid
}

const findValidMoves = (fen: ValidFen): Move[] => {
  return _withFen(fen).moves({ verbose: true })
}

const asValidFenSuccessor = (fen: ValidFen, move: Move): ValidFen | null => {
  const chess = _withFen(fen)
  const isOkOrNull = chess.move(move)
  if (isOkOrNull === null) {
    return null
  }
  return toValidFen(chess.fen())
}

const findValidSuccesors = (fen: ValidFen): [Move, ValidFen][] => {
  return findValidMoves(fen)
    .map((move) => {
      const successorOrNull = asValidFenSuccessor(fen, move)
      return successorOrNull ? [move, successorOrNull] : []
    })
    .filter((it) => it.length === 2) as [Move, ValidFen][]
}

export const toValidFen = (fen: Fen): ValidFen => {
  return new ValidFenImpl(fen)
}
