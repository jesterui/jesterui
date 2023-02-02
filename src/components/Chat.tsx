import { useState } from 'react';
import { Input } from 'react-daisyui'

import { useOutgoingNostrEvents } from '../context/NostrEventsContext'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { JESTER_MESSAGE_KIND, KindEnum } from '../util/jester'
import { useGameStore } from '../context/GameEventStoreContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { GameChatEvent } from '../util/app_db';

export const constructChatMessage = (
  pubkey: NIP01.PubKey,
  message: string,
  startId: NIP01.EventId,
): NIP01.UnsignedEvent => {

  const eventParts = NostrEvents.blankEvent()
  eventParts.kind = JESTER_MESSAGE_KIND
  eventParts.pubkey = pubkey
  eventParts.created_at = Math.floor(Date.now() / 1000)
  eventParts.content = JSON.stringify({
    version: '0',
    kind: KindEnum.Chat,
    message
  })
  eventParts.tags = [
    [NIP01.TagEnum.e, startId],
  ]
  return NostrEvents.constructEvent(eventParts)
}

export default function Chat({ privKey, ourPubKey, theirPubKey, startId }: { privKey: NIP01.PrivKey | null, ourPubKey: NIP01.PubKey | null, theirPubKey?: NIP01.PubKey, startId?: NIP01.EventId }) {
  const outgoingNostr = useOutgoingNostrEvents()
  const gameStore = useGameStore()

  const existingMessages = useLiveQuery(
    async () => {
      if (!startId) return []

      const events = await gameStore.game_chat.where('gameId').equals(startId).sortBy('created_at')
      return events
    },
    [startId],
    [] as GameChatEvent[]
  )

  const [message, setMessage] = useState<string>("");

  if (!(privKey && ourPubKey && theirPubKey && startId)) return null;

  const sendChatMessage = async (message: string) => {
    if (!outgoingNostr) {
      throw new Error('Nostr EventBus not ready..')
    }
    return await new Promise<NIP01.Event>(function (resolve, reject) {
      setTimeout(() => {
        try {
          const event = constructChatMessage(ourPubKey, message, startId)
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
      setMessage("")
    }
  }

  return (
    <div>
      {
        existingMessages
          .map(({ pubkey, content }) => ({ pubkey, message: JSON.parse(content).message }))
          .map(({ pubkey, message }, i) => {
            const textAlign = pubkey === ourPubKey ? "text-right" : "text-left";
            return (
              <div key={i} className="flex items-center gap-1">
                <div className="grow form-control">
                  <Input className={textAlign} type="text" onKeyDown={handleOnKeyDown} value={message} readOnly={true} />
                </div>
              </div>
            )
          }
          )
      }
      <div className="flex items-center gap-1">
        <div className="grow form-control">
          <Input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleOnKeyDown} />
        </div>
      </div>
      <div className="flex justify-center my-1">
        <small className="text-secondary">Chat with your opponent!</small>
      </div>
    </div>
  )
}