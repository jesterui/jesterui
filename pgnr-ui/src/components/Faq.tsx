import React from 'react'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Heading6 from '@material-tailwind/react/Heading6'

export default function Faq() {
  return (
    <div className="screen-faq">
      <Heading1 color="blueGray">FAQ</Heading1>

      <Heading6 color="blueGray">Nostr</Heading6>
      <div>
        - nostr (GitHub): <a href="https://github.com/fiatjaf/nostr">https://github.com/fiatjaf/nostr</a>
      </div>
      <div>
        - nostr-rs-relay (GitHub):{' '}
        <a href="https://github.com/scsibug/nostr-rs-relay">https://github.com/scsibug/nostr-rs-relay</a>
      </div>
      <Heading6 color="blueGray">Chess Libs</Heading6>
      <div>
        - chess.js (GitHub): <a href="https://github.com/jhlywa/chess.js/">https://github.com/jhlywa/chess.js/</a>
      </div>
      <div>
        - Chessground (GitHub):{' '}
        <a href="https://github.com/lichess-org/chessground">https://github.com/lichess-org/chessground</a>
      </div>
      <div>
        - Chessground Examples (GitHub):{' '}
        <a href="https://github.com/lichess-org/chessground-examples">
          https://github.com/lichess-org/chessground-examples
        </a>
      </div>
      <div>
        - Chessground Config (GitHub):{' '}
        <a href="https://github.com/lichess-org/chessground/blob/master/src/config.ts#L7-L90">
          https://github.com/lichess-org/chessground/blob/master/src/config.ts#L7-L90
        </a>
      </div>
      <div>
        - react/chessground (GitHub):{' '}
        <a href="https://github.com/react-chess/chessground">https://github.com/react-chess/chessground</a>
      </div>
      <div>
        - react-chessboard (GitHub):{' '}
        <a href="https://github.com/Clariity/react-chessboard">https://github.com/Clariity/react-chessboard</a>
      </div>

      <Heading6 color="blueGray">Theming</Heading6>
      <div>
        - material-tailwind (GitHub):{' '}
        <a href="https://github.com/creativetimofficial/material-tailwind">
          https://github.com/creativetimofficial/material-tailwind
        </a>
      </div>
      <div>
        - Material Icons:{' '}
        <a href="https://fonts.google.com/icons?selected=Material+Icons">
          https://fonts.google.com/icons?selected=Material+Icons
        </a>
      </div>

      <Heading6 color="blueGray">React</Heading6>
      <div>
        - React documentation: <a href="https://reactjs.org/">https://reactjs.org/</a>
      </div>
      <div>
        - create-react-app:{' '}
        <a href="https://facebook.github.io/create-react-app/docs/getting-started">
          https://facebook.github.io/create-react-app/docs/getting-started
        </a>
      </div>

      <Heading6 color="blueGray">Other</Heading6>
      <div>
        - mermaid:{' '}
        <a href="https://mermaid-js.github.io/mermaid/#/sequenceDiagram">
          https://mermaid-js.github.io/mermaid/#/sequenceDiagram
        </a>
      </div>
    </div>
  )
}
