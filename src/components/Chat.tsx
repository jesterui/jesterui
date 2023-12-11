import { useMemo, useState } from 'react'
import { ChatBubble, Input } from 'react-daisyui'

import { useOutgoingNostrEvents } from '../context/NostrEventsContext'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { GameChatEvent } from '../util/app_db'
import { useLiveQuery } from 'dexie-react-hooks'
import { useGameStore } from '../context/GameEventStoreContext'
import { timeElapsed } from '../util/utils'

export const constructChatMessage = (
  pubkey: NIP01.PubKey,
  message: string,
  startId: NIP01.EventId
): NIP01.UnsignedEvent => {
  const eventParts = NostrEvents.blankEvent()
  eventParts.kind = 1
  eventParts.pubkey = pubkey
  eventParts.created_at = Math.floor(Date.now() / 1000)
  eventParts.content = message
  eventParts.tags = [[NIP01.TagEnum.e, startId]]
  return NostrEvents.constructEvent(eventParts)
}

type ChatProps = {
  privKey: NIP01.PrivKey
  ourPubKey: NIP01.PubKey
  player1PubKey: NIP01.PubKey
  player2PubKey: NIP01.PubKey
  gameId: NIP01.EventId
}

export default function Chat({ privKey, ourPubKey, player1PubKey, player2PubKey, gameId }: ChatProps) {
  const outgoingNostr = useOutgoingNostrEvents()
  const gameStore = useGameStore()

  const chatMessages = useLiveQuery(
    async () => {
      if (!gameId) return []

      const events = await gameStore.game_chat.where('gameId').equals(gameId).sortBy('created_at')
      return events.filter((event) => [player1PubKey, player2PubKey].includes(event.pubkey))
    },
    [gameId, player1PubKey, player2PubKey],
    [] as GameChatEvent[]
  )

  const isPlayer = useMemo(
    () => [player1PubKey, player2PubKey].includes(ourPubKey),
    [ourPubKey, player1PubKey, player2PubKey]
  )

  const [message, setMessage] = useState<string>('')

  const sendChatMessage = async (message: string) => {
    if (!outgoingNostr) {
      throw new Error('Nostr EventBus not ready..')
    }
    return await new Promise<NIP01.Event>(function (resolve, reject) {
      setTimeout(() => {
        try {
          const event = constructChatMessage(ourPubKey, message, gameId)
          const signedEvent = NostrEvents.signEvent(event, privKey)
          outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))
          resolve(signedEvent)
        } catch (e) {
          reject(e)
        }
      }, 1)
    })
  }

  const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendChatMessage(message)
      setMessage('')
    }
  }

  return (
    <div>
      {chatMessages.map(({ pubkey, content, created_at }, i) => {
        const isMyMessage = pubkey === ourPubKey
        return (
          <div key={i} className="flex flex-col gap-1">
            <ChatBubble end={isMyMessage}>
              <ChatBubble.Message>{content}</ChatBubble.Message>
              <ChatBubble.Footer>
                <ChatBubble.Time>{timeElapsed(created_at * 1_000)}</ChatBubble.Time>
              </ChatBubble.Footer>
            </ChatBubble>
          </div>
        )
      })}
      {isPlayer && (
        <>
          <div className="flex items-center gap-1">
            <div className="grow form-control">
              <Input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleOnKeyDown}
              />
            </div>
          </div>
          <div className="flex justify-center my-1">
            <small className="text-secondary">Chat with your opponent!</small>
          </div>
        </>
      )}
    </div>
  )
}
