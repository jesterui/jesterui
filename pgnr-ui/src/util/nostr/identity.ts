import * as secp256k1 from '@noble/secp256k1'
import { Buffer } from 'buffer'

export const generatePrivateKey = () => {
  return Buffer.from(secp256k1.utils.randomPrivateKey()).toString('hex')
}

export const publicKey = (privateKey: string) => {
  return Buffer.from(secp256k1.schnorr.getPublicKey(privateKey)).toString('hex')
}
