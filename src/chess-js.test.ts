/**
 * @jest-environment node
 */
import * as Chess from 'chess.js'
import { FEN_START_POSITION } from './util/jester'

it('should load empty pgn', () => {
  const pgn = [''].join('\n')

  const game = new Chess.Chess()

  expect(() => game.loadPgn(pgn)).not.toThrowError()
  expect(game.fen()).toBe(FEN_START_POSITION)
  console.log(game.pgn())
})

it('should load minimal pgn', () => {
  const pgn = ['*'].join('\n')

  const game = new Chess.Chess()

  expect(() => game.loadPgn(pgn)).not.toThrowError()
  expect(game.fen()).toBe(FEN_START_POSITION)
  console.log(game.pgn())
})

it('should load empty pgn with headers', () => {
  const nowIsoString = new Date().toISOString()
  const pgn = [
    '[Event "Casual Game"]',
    '[Site "Jester"]',
    `[Date "${nowIsoString.substring(0, 10).replaceAll('-', '.')}"]`,
    '[Round "-"]',
    `[White "?"]`,
    `[Black "?"]`,
    '[Result "*"]',
  ].join('\n')

  const game = new Chess.Chess()

  expect(() => game.loadPgn(pgn)).not.toThrowError()
  expect(game.fen()).toBe(FEN_START_POSITION)

  console.log(game.pgn())
})

it('should load minimal pgn with headers', () => {
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

  expect(() => game.loadPgn(pgn)).not.toThrowError()
  expect(game.fen()).toBe(FEN_START_POSITION)

  console.log(game.pgn())
})

it('should load pgn from Portable_Game_Notation wikipedia acticle', () => {
  const pgn = [
    '[Event "F/S Return Match"]',
    '[Site "Belgrade, Serbia JUG"]',
    '[Date "1992.11.04"]',
    '[Round "29"]',
    '[White "Fischer, Robert J."]',
    '[Black "Spassky, Boris V."]',
    '[Result "1/2-1/2"]',
    '',
    '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This opening is called the Ruy Lopez.}',
    '4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7',
    '11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5',
    'Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6',
    '23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5',
    'hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5',
    '35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6',
    'Nf2 42. g4 Bd3 43. Re6 1/2-1/2',
  ].join('\n')

  const game = new Chess.Chess()

  expect(() => game.loadPgn(pgn)).not.toThrowError()
  expect(game.fen()).toBe('8/8/4R1p1/2k3p1/1p4P1/1P1b1P2/3K1n2/8 b - - 2 43')

  console.log(game.pgn())
})

it('should load pgn from runnig game', () => {
  const pgn = [
    '[Event "F/S Return Match"]',
    '[Site "Belgrade, Serbia JUG"]',
    '[Date "1992.11.04"]',
    '[Round "29"]',
    '[White "Fischer, Robert J."]',
    '[Black "Spassky, Boris V."]',
    '[Result "*"]',
    '',
    '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This opening is called the Ruy Lopez.}',
    '4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7',
    '11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5',
    'Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6',
    '23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5',
    'hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5',
    '35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6',
    'Nf2 42. g4',
  ].join('\n')

  const game = new Chess.Chess()

  expect(() => game.loadPgn(pgn)).not.toThrowError()
  expect(game.fen()).toBe('8/8/R5p1/2k2bp1/1p4P1/1P3P2/3K1n2/8 b - - 0 42')

  console.log(game.pgn())
})
