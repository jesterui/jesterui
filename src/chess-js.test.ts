import * as Chess from 'chess.js'

it('should load minimal pgn', () => {
  const pgn = ['*'].join('\n')

  const game = new Chess.Chess()
  const isValid = game.load_pgn(pgn)

  expect(isValid).toBe(true)
  expect(game.fen()).not.toBe(true)
})

it('should load pgn with headers', () => {
  const nowIsoString = new Date().toISOString()
  const pgn = [
    '[Event "Casual Game"]',
    '[Site "Jester"]',
    `[Date "${nowIsoString.substring(0, 10).replaceAll('-', '.')}"]`,
    '[Round "-"]',
    `[White "?"]`,
    `[Black "?"]`,
    '[Result "*"]',
    '',
    '*',
  ].join('\n')

  const game = new Chess.Chess()
  const isValid = game.load_pgn(pgn)

  expect(isValid).toBe

  console.log(game.pgn())
})