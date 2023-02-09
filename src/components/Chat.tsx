import { useEffect, useState } from 'react';
import { ChatBubble, Input } from 'react-daisyui'

import { useIncomingNostrEvents, useOutgoingNostrEvents } from '../context/NostrEventsContext'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'

export const constructChatMessage = (
  pubkey: NIP01.PubKey,
  message: string,
  startId: NIP01.EventId,
): NIP01.UnsignedEvent => {

  const eventParts = NostrEvents.blankEvent()
  eventParts.kind = 1
  eventParts.pubkey = pubkey
  eventParts.created_at = Math.floor(Date.now() / 1000)
  eventParts.content = message
  eventParts.tags = [
    [NIP01.TagEnum.e, startId],
  ]
  return NostrEvents.constructEvent(eventParts)
}

type ChatMessage = Pick<NIP01.Event, "content" | "pubkey" | "created_at">

export default function Chat({ privKey, ourPubKey, theirPubKey, gameId }: { privKey: NIP01.PrivKey | null, ourPubKey: NIP01.PubKey | null, theirPubKey?: NIP01.PubKey, gameId?: NIP01.EventId }) {
  const outgoingNostr = useOutgoingNostrEvents()
  const incomingNostr = useIncomingNostrEvents()
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const isGameChatEvent = (event: NIP01.Event): boolean => {
    return event.kind === 1 && event.tags.filter((t) => t[0] === NIP01.TagEnum.e).filter((t) => t[1] === gameId).length > 0
  }

  useEffect(() => {
    if (!incomingNostr) return
    const abortCtrl = new AbortController()
    incomingNostr.on(
      NIP01.RelayEventType.EVENT,
      (event: CustomEvent<NIP01.RelayMessage>) => {
        if (event.type !== NIP01.RelayEventType.EVENT) return
        const req = event.detail as NIP01.RelayEventMessage
        const nostrEvent = req[2];
        if (!isGameChatEvent(nostrEvent)) return
        const { content, pubkey, created_at } = nostrEvent;
        setChatMessages(chatMessages => {
          const newChatMessages = [...chatMessages, { content, pubkey, created_at }]
          // sort comments by created_at in ascending order
          newChatMessages.sort(({ created_at: a_created_at }, { created_at: b_created_at }) => a_created_at - b_created_at)
          return newChatMessages;
        })
      },
      { signal: abortCtrl.signal }
    )
    return () => abortCtrl.abort()
  }, [incomingNostr])

  const [message, setMessage] = useState<string>("");

  if (!(privKey && ourPubKey && theirPubKey && gameId)) return null;

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
      setMessage("")
    }
  }

  return (
    <div>
      {
        chatMessages
          .map(({ pubkey, content, created_at }, i) => {
            const isMyMessage = pubkey === ourPubKey;
            return (
              <div key={i} className="flex items-center gap-1">
                <div className="grow form-control">
                  <ChatBubble end={isMyMessage}>
                    <ChatBubble.Message>{content}</ChatBubble.Message>
                  </ChatBubble>
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