import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ChatBubble, Input } from 'react-daisyui'

import { useOutgoingNostrEvents } from '../context/NostrEventsContext'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import { GameChatEvent } from '../util/app_db'
import { useLiveQuery } from 'dexie-react-hooks'
import { useGameStore } from '../context/GameEventStoreContext'
import { timeElapsed, scrollToBottom } from '../util/utils'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'

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

type ChatBubblesProps = {
  messages: GameChatEvent[]
  ourPubKey?: NIP01.PubKey
  avatar?: (event: GameChatEvent) => React.ReactNode | null
  rerenderInterval?: Milliseconds
}

function ChatBubbles({ messages, ourPubKey, avatar, rerenderInterval = 5 * 1_000 }: ChatBubblesProps) {
  const [_unusedOnPurpose, setRerenderTriggerValue] = useState(() => Date.now())

  useEffect(() => {
    const abortCtrl = new AbortController()

    const timer = setInterval(() => !abortCtrl.signal.aborted && setRerenderTriggerValue(Date.now()), rerenderInterval)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [rerenderInterval])

  return (
    <>
      <div className="flex flex-col gap-1">
        {messages.map((message, index) => {
          const isMyMessage = !!ourPubKey && ourPubKey === message.pubkey
          return (
            <ChatBubble key={index} end={isMyMessage}>
              {avatar && <ChatBubble.Avatar className="w-10 h-10">{avatar(message)}</ChatBubble.Avatar>}
              <ChatBubble.Message className="break-words" color={isMyMessage ? 'primary' : undefined}>
                {message.content}
              </ChatBubble.Message>
              <ChatBubble.Footer>
                <ChatBubble.Time>{timeElapsed(message.created_at * 1_000)}</ChatBubble.Time>
              </ChatBubble.Footer>
            </ChatBubble>
          )
        })}
      </div>
    </>
  )
}

type ChatMessageInputProps = {
  value: string | undefined
  onChange: (value: string | undefined) => void
  onSubmit: (value: string | undefined) => void
}

function ChatMessageInput({ value, onChange, onSubmit }: ChatMessageInputProps) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSubmit(value)
    }
  }

  const onSubmitButtonClick = (_: React.MouseEvent<HTMLButtonElement>) => {
    onSubmit(value)
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <div className="grow form-control">
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={256}
          />
        </div>
        <Button type="button" className="flex gap-1 " onClick={onSubmitButtonClick}>
          Send <PaperAirplaneIcon title="send" className="w-6 h-6" />
        </Button>
      </div>
    </>
  )
}

type ChatProps = Pick<ChatBubblesProps, 'ourPubKey' | 'avatar'> & {
  gameId: NIP01.EventId
  player1PubKey: NIP01.PubKey
  player2PubKey: NIP01.PubKey
  privKey?: NIP01.PrivKey
  gameOver?: boolean
}

export default function Chat({
  gameId,
  player1PubKey,
  player2PubKey,
  privKey,
  avatar,
  ourPubKey,
  gameOver = false,
}: ChatProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const outgoingNostr = useOutgoingNostrEvents()
  const gameStore = useGameStore()

  const [messageInput, setMessageInput] = useState<string>()
  const [isSending, setIsSending] = useState(false)

  const chatMessages = useLiveQuery(
    async () => {
      if (!gameId) return []

      const events = await gameStore.game_chat.where('gameId').equals(gameId).sortBy('created_at')
      return events.filter((event) => [player1PubKey, player2PubKey].includes(event.pubkey))
    },
    [gameId, player1PubKey, player2PubKey],
    [] as GameChatEvent[]
  )

  useEffect(() => {
    const abortCtrl = new AbortController()
    const timer = setTimeout(() => {
      !abortCtrl.signal.aborted &&
        chatContainerRef.current &&
        scrollToBottom(chatContainerRef.current, {
          behavior: 'auto',
        })
    }, 21)
    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [chatMessages.length, isSending])

  const isPlayer = useMemo(
    () => ourPubKey && [player1PubKey, player2PubKey].includes(ourPubKey),
    [ourPubKey, player1PubKey, player2PubKey]
  )

  const sendChatMessage = async (message: string) => {
    if (!privKey || !ourPubKey) return
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
      }, 4)
    })
  }

  const doSubmit = async (content: string) => {
    if (!isSending && content) {
      setIsSending(true)
      return sendChatMessage(content).finally(() => {
        setIsSending(false)
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex px-1">
        <small>Chat with your opponent!</small>
      </div>
      <div className="h-64 overflow-y-auto pr-4" ref={chatContainerRef}>
        <ChatBubbles ourPubKey={ourPubKey} messages={chatMessages} avatar={avatar} />
      </div>
      {isPlayer && (
        <>
          <ChatMessageInput
            value={messageInput}
            onChange={setMessageInput}
            onSubmit={async (val) =>
              val &&
              doSubmit(val.trim()).then(() => {
                setMessageInput(undefined)
              })
            }
          />
        </>
      )}
    </div>
  )
}
