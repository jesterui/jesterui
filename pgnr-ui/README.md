# jester-ui


TODO:
- [ ] only let validated moves into "game event store" -> currently received out of order
      with ability to insert invalid events.
- [ ] strip down contents of "game move" to bare minimum, e.g. does it really need the fen?
  - [ ] Send nostr events `content` as chess json proto?
- [ ] currently, player started the game is always white 
  - others players can make moves for black -> it is not locked to the first mover and basically a one vs. all

- [ ] ability to delete data in indexeddb
- [ ] add ability to watch games next to "currentGameId" aka pinning games
- [ ] ability to load game by id
- [ ] ability to use nos2x (browser extension)
- [ ] ability for multiple nostr gateways
- [ ] 2nd: Readonly mode (no priv key), white (game start), black (joining a game)
- [ ] on private 1-on-1 games, never let other (non-participating) pubkeys create moves
- [ ] make "multichess" option - users are either black/white and vote on moves
- [ ] add POW if necessary
- [ ] rename to jester
- [ ] ability to "offer draw", "draw by agreement", "give up"
- [ ] "promote to other piece than queen"
- [ ] support more NIPs!
 
---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Resources
- nostr (GitHub): https://github.com/fiatjaf/nostr
- nostr-rs-relay (GitHub): https://github.com/scsibug/nostr-rs-relay

- React documentation: https://reactjs.org/
- create-react-app: https://facebook.github.io/create-react-app/docs/getting-started

- chess.js (GitHub): https://github.com/jhlywa/chess.js/
- Chessground (GitHub): https://github.com/lichess-org/chessground
- Chessground Examples (GitHub): https://github.com/lichess-org/chessground-examples
- Chessground Config (GitHub): https://github.com/lichess-org/chessground/blob/master/src/config.ts#L7-L90
- react/chessground (GitHub): https://github.com/react-chess/chessground

- Stockfish (GitHub): https://github.com/nmrugg/stockfish.js
- chessbot-typescript (GitHub): https://github.com/eddmann/chessbot-typescript

- CTX Chess Tournament Exchange format (XML): https://github.com/fnogatz/CTX

- material-tailwind (GitHub): https://github.com/creativetimofficial/material-tailwind

- react-chessboard (GitHub): https://github.com/Clariity/react-chessboard

- mermaid: https://mermaid-js.github.io/mermaid/#/sequenceDiagram