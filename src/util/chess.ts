
import * as Chess from 'chess.js'

// e.g. 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
export type Fen = string

// e.g. 'e4', 'exd5', etc.
export type San = string

// e.g. '1. e4 d5 2. exd5 c6 3. dxc6'
export type Pgn = string

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
  value(): Chess.Move
  source(): ValidFen
  target(): ValidFen
}

class ValidMovesImpl implements ValidMoves {
  private _source: ValidFen
  private _validMoves: ValidMove[]
  constructor(source: ValidFen) {
    this._source = source

    const validSuccessors: [Chess.Move, ValidFen][] = findValidSuccesors(this._source)
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

const _chessInstance: Chess.ChessInstance = new Chess.Chess()

const _withFen = (fen: ValidFen): Chess.ChessInstance => {
  const fenLoaded = _chessInstance.load(fen.value())
  if (!fenLoaded) {
    throw new Error('Could not load fen')
  }
  return _chessInstance
}

const isValidFen = (fen: Fen): boolean => {
  return _chessInstance.validate_fen(fen).valid
}

const findValidMoves = (fen: ValidFen): Chess.Move[] => {
  return _withFen(fen).moves({ verbose: true })
}

const asValidFenSuccessor = (fen: ValidFen, move: Chess.Move): ValidFen | null => {
  const chess = _withFen(fen)
  const isOkOrNull = chess.move(move)
  if (isOkOrNull === null) {
    return null
  }
  return toValidFen(chess.fen())
}

const findValidSuccesors = (fen: ValidFen): [Chess.Move, ValidFen][] => {
  return findValidMoves(fen)
    .map((move) => {
      const successorOrNull = asValidFenSuccessor(fen, move)
      return successorOrNull ? [move, successorOrNull] : []
    })
    .filter((it) => it.length === 2) as [Chess.Move, ValidFen][]
}

export const toValidFen = (fen: Fen): ValidFen => {
  return new ValidFenImpl(fen)
}

// in:  ['e4', 'd5', 'exd5', 'c6', 'dxc6']
// out: '1. e4 d5 2. exd5 c6 3. dxc6'
export const historyToMinimalPgn = (history: San[]): Pgn => {
  const paired = history.reduce<San[]>((result: San[], value: San, currentIndex: number, array: San[]) => {
    if (currentIndex % 2 === 0) {
      return [...result, array.slice(currentIndex, currentIndex + 2)] as San[]
    }
    return result
  }, [])

  const lines = paired.map((val, index) => {
    if (val.length === 1) {
      return `${index + 1}. ${val[0]}`
    }
    return `${index + 1}. ${val[0]} ${val[1]}`
  })

  return lines.join(' ')
}
