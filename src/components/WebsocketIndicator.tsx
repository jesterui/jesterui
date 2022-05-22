import { ActivityIndicator } from '../components/ActivityIndicator'
import { useWebsocket } from '../context/WebsocketContext'

export const WebsocketIndicator = () => {
  const websocket = useWebsocket()

  return (
    <ActivityIndicator
      isOn={websocket?.readyState === WebSocket.OPEN}
      isError={websocket && websocket.readyState === WebSocket.CLOSED}
    />
  )
}
