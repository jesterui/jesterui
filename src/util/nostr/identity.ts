import { schnorr } from '@noble/curves/secp256k1'
import { utils, etc } from '@noble/secp256k1'
import { bytesToHex } from '@noble/hashes/utils'

import * as NIP01 from '../../util/nostr/nip01'

export const hashToPrivateKey = (hex: Hex): NIP01.PrivKey => {
  return bytesToHex(etc.hashToPrivateKey(hex))
}

export const generatePrivateKey = (): NIP01.PrivKey => {
  return bytesToHex(utils.randomPrivateKey())
}

export const publicKey = (privateKey: NIP01.PrivKey): NIP01.PubKey => {
  return bytesToHex(schnorr.getPublicKey(privateKey))
}
