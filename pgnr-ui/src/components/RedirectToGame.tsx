import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import * as NIP01 from '../util/nostr/nip01'
import * as JesterUtils from '../util/jester'

interface RedirectToGameProps {
  jesterId?: JesterUtils.JesterId
}
// TODO: this whole component is a hack.. generally works, but please try to remove it
export default function RedirectToGame({ jesterId: argJesterId }: RedirectToGameProps) {
  const { jesterId: paramsJesterId } = useParams<{ jesterId: JesterUtils.JesterId | undefined }>()

  const [jesterId] = useState<JesterUtils.JesterId | undefined>(
    JesterUtils.tryParseJesterId(argJesterId) || JesterUtils.tryParseJesterId(paramsJesterId) || undefined
  )

  const navigate = useNavigate()

  useEffect(() => {
    if (!jesterId) return

    navigate(`/game/${jesterId}`)
  }, [navigate, jesterId])

  return <>Redirecting to {jesterId}...</>
}
