import { PubKey } from './nostr/nip01'

export const displayPubKey = (pubkey: PubKey, chars = 8, separator = '...') => {
  const prefixLength = Math.max(Math.floor(chars / 2), 1)
  if (pubkey.length <= prefixLength * 2) {
    return `${pubkey}`
  }
  return `${pubkey.substring(0, prefixLength)}${separator}${pubkey.substring(64 - prefixLength, 64)}`
}
