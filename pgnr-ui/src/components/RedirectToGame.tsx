import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import * as NIP01 from '../util/nostr/nip01'
import * as AppUtils from '../util/jester'

// TODO: this whole component is a hack.. generally works, but please try to remove it
export default function RedirectToGame({ gameId: argGameId }: { gameId?: NIP01.Sha256 | undefined }) {
  const { gameId: paramsGameId } = useParams<{ gameId: NIP01.Sha256 | undefined }>()
  const [gameId] = useState<NIP01.Sha256 | undefined>(argGameId || paramsGameId)

  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/game/${gameId}`)
  }, [navigate, gameId])

  return <>Redirecting to {gameId && AppUtils.gameDisplayNameShort(gameId)}...</>
}
