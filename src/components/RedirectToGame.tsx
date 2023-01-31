import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { JesterId, tryParseJesterId } from '../util/jester'

interface RedirectToGameProps {
  jesterId?: JesterId
  replace: boolean
}
// TODO: this whole component is a hack.. generally works, but please try to remove it
export default function RedirectToGame({ jesterId: argJesterId, replace }: RedirectToGameProps) {
  const navigate = useNavigate()

  const { jesterId: paramsJesterId } = useParams<{ jesterId: JesterId | undefined }>()

  const [jesterId] = useState<JesterId | undefined>(
    tryParseJesterId(argJesterId) || tryParseJesterId(paramsJesterId) || undefined
  )

  useEffect(() => {
    if (!jesterId) return

    navigate(`/game/${jesterId}`, { replace })
  }, [navigate, jesterId, replace])

  return <></>
}
