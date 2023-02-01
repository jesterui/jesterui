import * as secp256k1 from '@noble/secp256k1'
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'

export const prepareSecp256k1 = () => {
  // monkey patch secp256k1
  secp256k1.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, secp256k1.utils.concatBytes(...msgs))

  secp256k1.utils.sha256Sync = (...msgs) => sha256(secp256k1.utils.concatBytes(...msgs))
}
