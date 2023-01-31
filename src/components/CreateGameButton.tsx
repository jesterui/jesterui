import { RefObject, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSettings } from '../context/SettingsContext'
import { useOutgoingNostrEvents } from '../context/NostrEventsContext'

import * as NIP01 from '../util/nostr/nip01'
import * as NostrEvents from '../util/nostr/events'
import * as JesterUtils from '../util/jester'
import { getSession } from '../util/session'

// TODO: extract functionality in a "CreateGameButtonHook" or something..
interface CreateGameButtonProps {
  onGameCreated: (jesterId: JesterUtils.JesterId) => void
  buttonRef: RefObject<HTMLElement>
  text?: string
}

export function CreateGameButton({ buttonRef, onGameCreated, text = 'Start new game' }: CreateGameButtonProps) {
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  const onStartGameButtonClicked = useCallback(async () => {
    // TODO: do not use window.alert..
    if (!outgoingNostr) {
      window.alert('Nostr EventBus not ready..')
      return
    }
    if (!publicKeyOrNull) {
      window.alert('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      window.alert('PrivKey not available..')
      return
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const event = JesterUtils.constructStartGameEvent(publicKey)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))

    onGameCreated(JesterUtils.gameIdToJesterId(signedEvent.id))
  }, [outgoingNostr, publicKeyOrNull, privateKeyOrNull, onGameCreated])

  const onClick = useCallback(() => onStartGameButtonClicked(), [onStartGameButtonClicked])

  useEffect(() => {
    if (!buttonRef.current) return

    buttonRef.current.onclick = (e) => {
      e.preventDefault()
      onClick()
    }
  }, [buttonRef, onClick])

  return <></>
}

interface CreateGameAndRedirectButtonHookProps {
  buttonRef: RefObject<HTMLElement>
}

export function CreateGameAndRedirectButtonHook({ buttonRef }: CreateGameAndRedirectButtonHookProps) {
  const navigate = useNavigate()

  const onGameCreated = async (jesterId: JesterUtils.JesterId) => {
    // TODO: this is a hack so we do not need to watch for gameId changes..
    // please, please please.. try to remove it and immediately
    // navigate to /game/:gameId
    navigate(`/redirect/game/${jesterId}`)
  }

  return <CreateGameButton buttonRef={buttonRef} onGameCreated={onGameCreated} />
}

interface GameRedirectButtonHookProps {
  buttonRef: RefObject<HTMLElement>
  jesterId: JesterUtils.JesterId
}

export function GameRedirectButtonHook({ buttonRef, jesterId }: GameRedirectButtonHookProps) {
  const navigate = useNavigate()

  const onClick = useCallback(() => navigate(`/redirect/game/${jesterId}`), [navigate, jesterId])

  useEffect(() => {
    if (!buttonRef) return
    if (!buttonRef.current) return

    buttonRef.current.onclick = (e) => {
      e.preventDefault()
      onClick()
    }
  }, [buttonRef, onClick])

  return <></>
}

interface CreateDirectChallengeButtonHookProps {
  opponentPubKey: string
  buttonRef: RefObject<HTMLElement>
  onGameCreated?: (jesterId: JesterUtils.JesterId) => void
}

export function CreateDirectChallengeButtonHook({
  opponentPubKey,
  buttonRef,
  onGameCreated,
}: CreateDirectChallengeButtonHookProps) {
  const outgoingNostr = useOutgoingNostrEvents()
  const settings = useSettings()

  const publicKeyOrNull = useMemo(() => settings.identity?.pubkey || null, [settings])
  const privateKeyOrNull = getSession()?.privateKey || null

  const onStartGameButtonClicked = useCallback(async () => {
    // TODO: do not use window.alert..
    if (!outgoingNostr) {
      window.alert('Nostr EventBus not ready..')
      return
    }
    if (!publicKeyOrNull) {
      window.alert('PubKey not available..')
      return
    }
    if (!privateKeyOrNull) {
      window.alert('PrivKey not available..')
      return
    }

    const publicKey = publicKeyOrNull!
    const privateKey = privateKeyOrNull!

    const event = JesterUtils.constructPrivateStartGameEvent(publicKey, opponentPubKey)
    const signedEvent = await NostrEvents.signEvent(event, privateKey)
    outgoingNostr.emit(NIP01.ClientEventType.EVENT, NIP01.createClientEventMessage(signedEvent))

    onGameCreated && onGameCreated(JesterUtils.gameIdToJesterId(signedEvent.id))
  }, [outgoingNostr, publicKeyOrNull, privateKeyOrNull, opponentPubKey, onGameCreated])

  const onClick = useCallback(() => onStartGameButtonClicked(), [onStartGameButtonClicked])

  useEffect(() => {
    if (!buttonRef) return
    if (!buttonRef.current) return

    buttonRef.current.onclick = (e) => {
      e.preventDefault()
      onClick()
    }
  }, [buttonRef, onClick])

  return <></>
}

export function CreateDirectChallengeAndRedirectButtonHook({
  buttonRef,
  opponentPubKey,
  onGameCreated,
}: CreateDirectChallengeButtonHookProps) {
  const navigate = useNavigate()

  const onGameCreatedInternal = async (jesterId: JesterUtils.JesterId) => {
    navigate(`/redirect/game/${jesterId}`)
    onGameCreated && onGameCreated(jesterId)
  }

  return (
    <CreateDirectChallengeButtonHook
      buttonRef={buttonRef}
      opponentPubKey={opponentPubKey}
      onGameCreated={onGameCreatedInternal}
    />
  )
}
