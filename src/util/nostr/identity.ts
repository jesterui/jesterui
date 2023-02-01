import * as secp256k1 from '@noble/secp256k1'
import { bytesToHex } from '@noble/hashes/utils'

import * as NIP01 from '../../util/nostr/nip01'

export const hashToPrivateKey = (hex: Hex): NIP01.PrivKey => {
  return bytesToHex(secp256k1.utils.hashToPrivateKey(hex))
}

export const generatePrivateKey = (): NIP01.PrivKey => {
  return bytesToHex(secp256k1.utils.randomPrivateKey())
}

export const publicKey = (privateKey: NIP01.PrivKey): NIP01.PubKey => {
  return bytesToHex(secp256k1.schnorr.getPublicKey(privateKey))
}
