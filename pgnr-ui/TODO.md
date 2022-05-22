## TODO
- [ ] Onboarding intro
- [ ] Dark Mode
- [ ] Color scheme: More clean interface, use bright, warm colors
- [ ] Move Menu from Navbar to Sidebar - only necessary stuff in navbar
- [ ] Identity Wizard with Description (pregenerate identity?)

- [ ] jester should accept challenges
- [ ] let user rechallenge personal robot when game is over
- [ ] personal robot should give up hopeless positions (needs "resign" functionality)
 
- [ ] only let validated moves into "game event store" -> currently received out of order
      with ability to insert invalid events.
- [ ] strip down contents of "game move" to bare minimum, e.g. does it really need the fen?
  - [ ] Send nostr events `content` as chess json proto?
- [ ] currently, player started the game is always white 
  - others players can make moves for black -> it is not locked to the first mover and basically a one vs. all

- [ ] personal robot should make move even when currentGameId is other game
- [ ] on private 1-on-1 games, never let other (non-participating) pubkeys create moves

- [ ] show current identity and nostr server (tooltip?) in navbar
  - [ ] cycle through till first connection is successful
- [ ] update FLOW.md to actual workflow
- [ ] ability to search by fen! games by fen -> send fen as hash in event!
- [ ] ability to delete data in indexeddb
- [ ] ability to watch games next to "currentGameJesterId" aka pinning games
- [ ] ability to use nos2x (browser extension)
- [ ] ability for multiple nostr gateways
  - [ ] save relay an event was first seen and try to subscribe to it when fetching?
- [ ] ability to "offer draw", "draw by agreement", "resign"
- [ ] "promote to other piece than queen"
- [ ] crashes in firefox private mode (indexeddb is read-only..)
- [ ] support more NIPs!

- [ ] PWA compatibility
