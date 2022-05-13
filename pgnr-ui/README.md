# jester-ui


## TODO
### primary
- [ ] only let validated moves into "game event store" -> currently received out of order
      with ability to insert invalid events.
- [ ] strip down contents of "game move" to bare minimum, e.g. does it really need the fen?
  - [ ] Send nostr events `content` as chess json proto?
- [ ] currently, player started the game is always white 
  - others players can make moves for black -> it is not locked to the first mover and basically a one vs. all

- [x] let user play against a bot via nostr
  - bot should make move even when currentGameId is other game
- [ ] Color scheme: More clean interface, use bright, warm colors
- [ ] Dark Mode
- [ ] Move Menu from Navbar to Sidebar - only necessary stuff in navbar
- [ ] Identity Wizard with Description, pregenerate identity?
- [ ] new identity on game page -> so that the links are useful
- [x] http not working -> needs https
- [ ] hide lobby behind dev flag for now - call it "challenges" or smth
- [ ] make a "my created games" site till lobby is only in dev mode
- [ ] show current game card on index page
- [ ] privacy on subscription names - randomize on demand
- [ ] on private 1-on-1 games, never let other (non-participating) pubkeys create moves
- [ ] "Robots lovingly delivered by Robohash.org"

### Secondary
- [ ] show current identity and nostr server (tooltip?) in navbar
- [x] use first nostr server in list for auto-connect
  - [ ] cycle through till first connection is successful
- [ ] update FLOW.md to actual workflow
- [x] encode and shorten gameIds
- [ ] search by fen! games by fen -> send fen as hash in event!
- [ ] ability to delete data in indexeddb
- [ ] add ability to watch games next to "currentGameJesterId" aka pinning games
- [x] ability to load game by id
- [ ] ability to use nos2x (browser extension)
- [ ] ability for multiple nostr gateways
  - [ ] save relay an event was first seen and try to subscribe to it when fetching?
- [ ] 2nd: Readonly mode (no priv key), white (game start), black (joining a game)
- [ ] make "multichess" option - users are either black/white and vote on moves
- [ ] add POW if necessary
- [ ] rename to jester
- [ ] ability to "offer draw", "draw by agreement", "give up"
- [ ] "promote to other piece than queen"
- [ ] support more NIPs!
- [ ] crashes in firefox private mode (indexeddb is read-only..)

- [ ] Tournaments? How can they be implemented
- [ ] PWA compatibility

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