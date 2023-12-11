import { useEffect, useMemo, useState } from 'react'
import { ChatBubble, Input } from 'react-daisyui'

import { useIncomingNostrEvents, useOutgoingNostrEvents } from '../context/NostrEventsContext'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'

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

type ChatMessage = Pick<NIP01.Event, 'content' | 'pubkey' | 'created_at'>

const isGameChatEvent = (gameId: NIP01.EventId, event: NIP01.Event): boolean => {
  return (
    event.kind === 1 && event.tags.filter((t) => t[0] === NIP01.TagEnum.e).filter((t) => t[1] === gameId).length > 0
  )
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
  const incomingNostr = useIncomingNostrEvents()
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const isPlayer = useMemo(
    () => [player1PubKey, player2PubKey].includes(ourPubKey),
    [ourPubKey, player1PubKey, player2PubKey]
  )

  useEffect(() => {
    if (!incomingNostr) return
    const abortCtrl = new AbortController()
    incomingNostr.on(
      NIP01.RelayEventType.EVENT,
      (event: CustomEvent<NIP01.RelayMessage>) => {
        if (event.type !== NIP01.RelayEventType.EVENT) return
        const nostrEvent = (event.detail as NIP01.RelayEventMessage)[2]
        if (!isGameChatEvent(gameId, nostrEvent)) return
        if (![player1PubKey, player2PubKey].includes(nostrEvent.pubkey)) return

        setChatMessages((chatMessages) => {
          const newChatMessages = [...chatMessages, nostrEvent]
            // sort comments by created_at in ascending order
            .sort((a, b) => a.created_at - b.created_at)
          return newChatMessages
        })
      },
      { signal: abortCtrl.signal }
    )
    return () => abortCtrl.abort()
  }, [incomingNostr, gameId, player1PubKey, player2PubKey])

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
          <div key={i} className="flex items-center gap-1">
            <div className="grow form-control">
              <ChatBubble end={isMyMessage}>
                <ChatBubble.Message>{content}</ChatBubble.Message>
              </ChatBubble>
            </div>
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
