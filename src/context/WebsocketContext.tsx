import { ProviderProps, createContext, useEffect, useMemo, useState, useContext } from 'react'

import { useSettings } from '../context/SettingsContext'

const WEBSOCKET_RECONNECT_DELAY_STEP = 1_000
const WEBSOCKET_RECONNECT_MAX_DELAY = 10_000
const WEBSOCKET_ESTABLISH_CONNECTION_MAX_DURATION = 10_000

// minimum amount of time in milliseconds the connection must stay open to be considered "healthy"
const WEBSOCKET_CONNECTION_HEALTHY_DURATION = 3_000

// webservers will close a websocket connection on inactivity (e.g nginx default is 60s)
// specify the time in milliseconds at least one 'keepalive' message is sent
const WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL = 30_000

// return delay in milliseconds to attempt reconnecting after the connection has been lost
const connectionRetryDelayLinear = (attempt = 0) => {
  // linear increase per attempt by `step` amount till `max` is reached
  const delay = Math.max(WEBSOCKET_RECONNECT_DELAY_STEP, WEBSOCKET_RECONNECT_DELAY_STEP * attempt)
  return Math.min(delay, WEBSOCKET_RECONNECT_MAX_DELAY)
}

const createWebSocket = (target: string) => {
  const websocket = new WebSocket(target)

  websocket.onerror = (error) => {
    console.error('websocket error', error)
  }

  if (process.env.NODE_ENV === 'development') {
    websocket.onopen = () => {
      console.debug('websocket connection openend')
    }

    websocket.onclose = () => {
      console.debug('websocket connection closed')
    }
  }

  return websocket
}

const SendKeepAlive = ({ websocket }: { websocket: WebSocket | null }) => {
  useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()

    const sendKeepalive = () => {
      if (!websocket) return
      !abortCtrl.signal.aborted && send(websocket, '[]', { signal: abortCtrl.signal })
    }

    sendKeepalive()

    const keepaliveInterval = setInterval(() => sendKeepalive(), WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL)
    return () => {
      abortCtrl.abort()
      clearInterval(keepaliveInterval)
    }
  }, [websocket])

  return <></>
}

const ForceClosePendingConnections = ({ websocket }: { websocket: WebSocket | null }) => {
  useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()
    const forceCloseIfStillConnectingTimer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return
      // Problem:
      //   Some browsers will keep connecting longer than the retry delay, and if the service
      //   comes back up in the meantime, the connection fails nonetheless...
      //   A retry is only attempted, when the close listener is invoked.
      //
      // Solution:
      //   If the socket is still `CONNECTING` after a certain duration.. force-close it!
      //   e.g. this happens in Firefox after >10 attempts
      //
      // This ensures that the maximum amount of delay between retries is
      // `WEBSOCKET_ESTABLISH_CONNECTION_MAX_DURATION + WEBSOCKET_RECONNECT_MAX_DELAY`:
      // - WEBSOCKET_ESTABLISH_CONNECTION_MAX_DURATION to force-close a pending connection
      // - WEBSOCKET_RECONNECT_MAX_DELAY to attempt the retry
      const needsForceClose = websocket.readyState === WebSocket.CONNECTING
      console.debug(`[Websocket] Check if a force-close is needed..`, needsForceClose)
      if (needsForceClose) {
        websocket.close(1000, 'Force-close pending connection')
      }
    }, WEBSOCKET_ESTABLISH_CONNECTION_MAX_DURATION)

    return () => {
      clearTimeout(forceCloseIfStillConnectingTimer)
      abortCtrl.abort()
    }
  }, [websocket])

  return <></>
}

const LogConnectionReadyStateOnChange = ({ websocket }: { websocket: WebSocket | null }) => {
  useEffect(() => {
    if (websocket) {
      console.debug('[Websocket] Connection', readyStatePhrase(websocket.readyState), 'to', websocket.url)
    } else {
      console.debug('[Websocket] Not connected')
    }
  }, [websocket])

  return <></>
}

interface WebsocketContextEntry {
  websocket: WebSocket | null
  websocketState: number | null
}

const WebsocketContext = createContext<WebsocketContextEntry | undefined>(undefined)

const WebsocketProvider = ({ children }: ProviderProps<WebsocketContextEntry | undefined>) => {
  const settings = useSettings()
  const host = useMemo<string | null>(() => settings.relays[0] || null, [settings])
  const [websocket, setWebsocket] = useState<WebSocket | null>(() => (host ? createWebSocket(host) : null))
  const [websocketState, setWebsocketState] = useState<number | null>(null)
  const [isWebsocketHealthy, setIsWebsocketHealthy] = useState(false)
  const [connectionErrorCount, setConnectionErrorCount] = useState(0)
  const [retryCounter, setRetryCounter] = useState(0)

  useEffect(() => {
    const abortCtrl = new AbortController()

    const openWebsocketIfPossible = (url: string | null) => {
      if (!url) {
        console.debug('[Websocket] No connection attempt will be made.')
        setWebsocket(null)
      } else {
        console.debug('[Websocket] Trying to open connection to', url)
        setWebsocket(createWebSocket(url))
      }
    }

    if (!websocket) {
      console.debug('[Websocket] No connection established.. ')
      openWebsocketIfPossible(host)
    } else {
      const isClosed = websocket.readyState !== WebSocket.CONNECTING && websocket.readyState !== WebSocket.OPEN
      if (isClosed) {
        console.debug('[Websocket] Previous connection is closed..')
        openWebsocketIfPossible(host)
      } else {
        const shouldSwitchHosts = host === null || !websocket.url.startsWith(host)
        if (!shouldSwitchHosts) {
          console.debug('[Websocket] Websocket already connected to the correct host', websocket.url)
        } else {
          console.debug('[Websocket] Switching hosts.. closing socket to', websocket.url, '...')

          setConnectionErrorCount(0)
          setRetryCounter(0)
          websocket.addEventListener('close', () => !abortCtrl.signal.aborted && openWebsocketIfPossible(host), {
            once: true,
            signal: abortCtrl.signal,
          })
          websocket.close()
        }
      }
    }

    return () => abortCtrl.abort()
  }, [retryCounter, websocket, host])

  // update websocket state based on open/close events
  useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()

    const onStateChange = () => !abortCtrl.signal.aborted && setWebsocketState(websocket.readyState)

    websocket.addEventListener('open', onStateChange, { signal: abortCtrl.signal })
    websocket.addEventListener('close', onStateChange, { signal: abortCtrl.signal })

    return () => abortCtrl.abort()
  }, [websocket])

  useEffect(() => {
    console.debug(`[Websocket] Connection is ${isWebsocketHealthy ? 'healthy' : 'NOT healthy'}`)
    if (isWebsocketHealthy) {
      // connection must be healthy before the error counter can be reset.
      // otherwise the back-off mechanism assumes connections to be stable
      // and will always use the minimum delay between reconnect attempts.
      setConnectionErrorCount(0)
      setRetryCounter(0)
    }
  }, [isWebsocketHealthy])

  // reconnect handling in case the socket is closed
  useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()

    let assumeHealthyDelayTimer: NodeJS.Timeout
    let retryDelayTimer: NodeJS.Timeout

    const onOpen = (event: Event) => {
      if (abortCtrl.signal.aborted) return

      console.debug(
        `[Websocket] Connection is open - starting healthy timeout (${WEBSOCKET_CONNECTION_HEALTHY_DURATION}ms)..`
      )
      assumeHealthyDelayTimer = setTimeout(() => {
        const stillConnectedToSameSocket = event.target === websocket
        !abortCtrl.signal.aborted && setIsWebsocketHealthy(stillConnectedToSameSocket)
      }, WEBSOCKET_CONNECTION_HEALTHY_DURATION)
    }

    const onClose = (event: CloseEvent) => {
      if (abortCtrl.signal.aborted) return

      console.debug(`[Websocket] Connection was closed with ${event.code} - starting retry mechanism..`)
      setIsWebsocketHealthy(false)
      setConnectionErrorCount((prev) => {
        const retryDelay = connectionRetryDelayLinear(prev + 1)
        console.log(`Retrying to connect websocket in ${retryDelay}ms`)
        retryDelayTimer = setTimeout(() => {
          !abortCtrl.signal.aborted && setRetryCounter((prev) => prev + 1)
        }, retryDelay)
        return prev + 1
      })
    }

    websocket.addEventListener('open', onOpen, { signal: abortCtrl.signal })
    websocket.addEventListener('close', onClose, { signal: abortCtrl.signal })

    return () => {
      clearTimeout(assumeHealthyDelayTimer)
      clearTimeout(retryDelayTimer)
      abortCtrl.abort()
    }
  }, [websocket])

  return (
    <WebsocketContext.Provider value={{ websocket, websocketState }}>
      <SendKeepAlive websocket={websocket} />
      <ForceClosePendingConnections websocket={websocket} />
      <LogConnectionReadyStateOnChange websocket={websocket} />
      <>{children}</>
    </WebsocketContext.Provider>
  )
}

const useWebsocket = () => {
  const context = useContext(WebsocketContext)
  if (context === undefined) {
    throw new Error('useWebsocket must be used within a WebsocketProvider')
  }
  return context.websocket
}

const useWebsocketState = () => {
  const context = useContext(WebsocketContext)
  if (context === undefined) {
    throw new Error('useWebsocketState must be used within a WebsocketProvider')
  }
  return context.websocketState
}

const send = (websocket: WebSocket, data: any, { signal }: { signal?: AbortSignal }) => {
  const json = JSON.stringify(data)

  if (websocket.readyState === WebSocket.OPEN) {
    websocket.send(json)
  } else if (websocket.readyState === WebSocket.CONNECTING) {
    websocket.addEventListener(
      'open',
      (e) => (!signal || !signal.aborted) && e.isTrusted && websocket && websocket.send(json),
      {
        once: true,
        signal,
      }
    )
  }
}

const readyStatePhrase = (readyState: number | undefined) => {
  switch (readyState) {
    case WebSocket.CONNECTING:
      return 'CONNECTING'
    case WebSocket.OPEN:
      return 'OPEN'
    case WebSocket.CLOSING:
      return 'CLOSING'
    case WebSocket.CLOSED:
      return 'CLOSED'
    default:
      return 'UNKNOWN'
  }
}

export { WebsocketContext, WebsocketProvider, useWebsocket, useWebsocketState, send, readyStatePhrase }
