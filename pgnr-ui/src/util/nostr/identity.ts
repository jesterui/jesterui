import * as secp256k1 from '@alephium/noble-secp256k1'
import { Buffer } from 'buffer'

import * as NIP01 from '../../util/nostr/nip01'

export const hashToPrivateKey = (hex: string): NIP01.Hex => {
  return Buffer.from(secp256k1.utils.hashToPrivateKey(hex)).toString('hex')
}

export const generatePrivateKey = (): NIP01.Hex => {
  return Buffer.from(secp256k1.utils.randomPrivateKey()).toString('hex')
}

export const publicKey = (privateKey: string): NIP01.Hex => {
  return Buffer.from(secp256k1.schnorr.getPublicKey(privateKey)).toString('hex')
}
