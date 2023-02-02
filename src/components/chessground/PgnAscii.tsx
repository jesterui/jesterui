import { useEffect, useState } from 'react'
import { ChessInstance } from 'chess.js'

export default function PgnAscii({ game }: { game: ChessInstance }) {
  const [ascii, setAscii] = useState<string>(game.ascii())
  const [lines, setLines] = useState<Array<string>>([])

  useEffect(() => {
    setAscii(game.ascii())
  }, [game])

  useEffect(() => {
    setLines(ascii.match(/(.{1,32})/g) || [])
  }, [ascii])

  return (
    <div>
      <pre>
        {lines.map((line, index) => {
          return <div key={index}>{line}</div>
        })}
      </pre>
    </div>
  )
}
