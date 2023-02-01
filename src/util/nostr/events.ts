import { Buffer } from 'buffer'
import * as secp256k1 from '@noble/secp256k1'
import { bytesToHex } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'

import * as NIP01 from '../../util/nostr/nip01'

export type PrivKey = NIP01.Hex // | bigint | number

export const blankEvent = (): NIP01.EventInConstruction => {
  return {
    kind: 255,
    pubkey: '',
    content: '',
    tags: [],
    created_at: 0,
  }
}

export const constructEvent = (eventInConstruction: NIP01.EventInConstruction): NIP01.UnsignedEvent => {
  const parts: NIP01.EventParts = eventInConstruction as NIP01.EventParts
  const unsignedEvent: NIP01.UnsignedEvent = {
    id: createEventHash(parts),
    ...parts,
  }
  return validateEventOrThrow(unsignedEvent)
}

const signableEventData = (evt: NIP01.EventParts): NIP01.SignableEventData => {
  return [0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content]
}

export const createEventHash = (event: NIP01.EventParts): NIP01.Sha256 => {
  let eventHash = sha256
    .init()
    .update(Buffer.from(JSON.stringify(signableEventData(event))))
    .digest()
  return Buffer.from(eventHash).toString('hex')
}

export const validateEvent = (event: NIP01.UnsignedEvent): boolean => {
  try {
    return !!validateEventOrThrow(event)
  } catch (err) {
    return false
  }
}

export const validateEventOrThrow = (event: NIP01.UnsignedEvent): NIP01.UnsignedEvent => {
  if (event.id !== createEventHash(event)) throw new Error('Invalid event: id')
  if (typeof event.content !== 'string') throw new Error('Invalid event: content')
  if (typeof event.created_at !== 'number') throw new Error('Invalid event: created_at')
  if (!Array.isArray(event.tags)) throw new Error('Invalid event: tags')

  for (let i = 0; i < event.tags.length; i++) {
    let tag = event.tags[i]
    if (!Array.isArray(tag)) throw new Error('Invalid event: tag')
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === 'object') throw new Error('Invalid event: tag type')
    }
  }

  return event
}

export const signEvent = (unsignedEvent: NIP01.UnsignedEvent, privKey: PrivKey): NIP01.Event => {
  const sig = createSignature(unsignedEvent, privKey)
  return {
    ...unsignedEvent,
    sig,
  }
}

export const createSignature = (event: NIP01.UnsignedEvent, privKey: PrivKey): NIP01.Sig => {
  return bytesToHex(secp256k1.schnorr.signSync(createEventHash(event), privKey))
}

export const verifySignature = (event: NIP01.Event) => {
  return secp256k1.schnorr.verifySync(event.sig, event.id, event.pubkey)
}
