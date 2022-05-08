import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import * as JesterUtils from '../util/jester'

interface RedirectToGameProps {
  jesterId?: JesterUtils.JesterId
  replace: boolean
}
// TODO: this whole component is a hack.. generally works, but please try to remove it
export default function RedirectToGame({ jesterId: argJesterId, replace }: RedirectToGameProps) {
  const { jesterId: paramsJesterId } = useParams<{ jesterId: JesterUtils.JesterId | undefined }>()

  const [jesterId] = useState<JesterUtils.JesterId | undefined>(
    JesterUtils.tryParseJesterId(argJesterId) || JesterUtils.tryParseJesterId(paramsJesterId) || undefined
  )

  const navigate = useNavigate()

  useEffect(() => {
    if (!jesterId) return

    navigate(`/game/${jesterId}`, { replace })
  }, [navigate, jesterId])

  return <></>
}
