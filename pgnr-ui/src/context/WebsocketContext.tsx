import React, { ProviderProps, createContext, useEffect, useState, useContext } from 'react'
import { useSettings } from './SettingsContext'

const WEBSOCKET_RECONNECT_DELAY_STEP = 1_000
const WEBSOCKET_RECONNECT_MAX_DELAY = 10_000

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

interface WebsocketContextEntry {
  websocket: WebSocket | null
  websocketState: number | null
}

const WebsocketContext = createContext<WebsocketContextEntry | undefined>(undefined)

/**
 * Provider of a websocket connection to jmwalletd.
 *
 * See Websocket docs: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/v0.9.5/docs/JSON-RPC-API-using-jmwalletd.md#websocket
 */
const WebsocketProvider = ({ children }: ProviderProps<WebsocketContextEntry | undefined>) => {
  const settings = useSettings()
  const [host, setHost] = useState<string | null>(null)
  const [websocket, setWebsocket] = useState<WebSocket | null>(null)
  const [websocketState, setWebsocketState] = useState<number | null>(null)
  const [isWebsocketHealthy, setIsWebsocketHealthy] = useState(false)
  const setConnectionErrorCount = useState(0)[1]
  const [retryCounter, setRetryCounter] = useState(0)

  useEffect(() => {
    const host = settings.relays[0] || null
    setHost(host)
  }, [settings])

  useEffect(() => {
    const abortCtrl = new AbortController()

    const openWebsocketIfPossible = (url: string | null) => {
      if (!url) {
        console.debug('[Websocket] No connection attempt will be made.')
      } else {
        console.debug('[Websocket] Trying to open connection to', url)
        setWebsocket(createWebSocket(url))
      }
    }

    if (!websocket) {
      console.debug('[Websocket] No connection established.. ')
      openWebsocketIfPossible(host)
    } else {
      const isClosed = !(websocket.readyState in [WebSocket.CLOSING, WebSocket.CLOSED])
      if (isClosed) {
        console.debug('[Websocket] Former connection is closed..')
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
  }, [retryCounter, websocket, host, setWebsocket, setConnectionErrorCount])

  useEffect(() => {
    if (websocket) {
      console.debug('[Websocket] Connected to', websocket.url)
    } else {
      console.debug('[Websocket] Not connected')
    }
  }, [websocket, settings, setWebsocket])

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
  }, [isWebsocketHealthy, setConnectionErrorCount])

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
        setIsWebsocketHealthy(stillConnectedToSameSocket)
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
          setRetryCounter((prev) => prev + 1)
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
  }, [websocket, setConnectionErrorCount])

  useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()

    const sendKeepalive = () => {
      if (!websocket) return

      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send('ping')
      } else if (websocket.readyState === WebSocket.CONNECTING) {
        websocket.addEventListener(
          'open',
          (e) => !abortCtrl.signal.aborted && e.isTrusted && websocket && websocket.send('ping'),
          {
            once: true,
            signal: abortCtrl.signal,
          }
        )
      }
    }

    sendKeepalive()

    const keepaliveInterval = setInterval(() => sendKeepalive(), WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL)
    return () => {
      abortCtrl.abort()
      clearInterval(keepaliveInterval)
    }
  }, [websocket])

  return <WebsocketContext.Provider value={{ websocket, websocketState }}>{children}</WebsocketContext.Provider>
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

export { WebsocketContext, WebsocketProvider, useWebsocket, useWebsocketState }
