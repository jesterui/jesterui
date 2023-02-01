import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'

export const hashWithSha256 = (val: string): Hex => {
  /*let eventHash = sha256.init().update(Buffer.from(val)).digest()
  return Buffer.from(eventHash).toString('hex')*/
  return bytesToHex(sha256(utf8ToBytes(val)))
}

export const isFunction = (obj: any): obj is Function => typeof obj === 'function'

const NOOP = () => {}
export const noop = () => NOOP

export const identity = (val: any) => val

export const arrayEquals = (a: any, b: any): boolean => {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => (Array.isArray(val) ? arrayEquals(val, b[index]) : val === b[index]))
  )
}

export const debounce = (fn: Function, ms = 255) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}

export const throttle = (fn: Function, threshold = 2500, scope: unknown = undefined) => {
  let last: number
  let deferTimer: ReturnType<typeof setTimeout>

  return (...args: unknown[]) => {
    const context = scope || this

    const now = Date.now()
    const shouldDefer = last && now < last + threshold
    if (!shouldDefer) {
      last = now
      fn.apply(context, args)
    } else {
      clearTimeout(deferTimer)
      deferTimer = setTimeout(() => {
        last = now
        fn.apply(context, args)
      }, threshold)
    }
  }
}

export const once = <T>(fn: Function) => {
  let calls = 0
  let result: T | undefined = undefined
  return ((...args: unknown[]) => {
    if (calls === 0) {
      result = fn.apply(null, args)
      calls++
    }
    return result
  }) as (...args: unknown[]) => T
}

export const copyToClipboard = (
  text: string,
  fallbackInputField?: HTMLInputElement,
  errorMessage?: string
): Promise<boolean> => {
  const copyToClipboardFallback = (
    inputField: HTMLInputElement,
    errorMessage = 'Cannot copy value to clipboard'
  ): Promise<boolean> =>
    new Promise((resolve, reject) => {
      inputField.select()
      const success = document.execCommand && document.execCommand('copy')
      inputField.blur()
      success ? resolve(success) : reject(new Error(errorMessage))
    })

  // `navigator.clipboard` might not be available, e.g. on sites served over plain `http`.
  if (!navigator.clipboard && fallbackInputField) {
    return copyToClipboardFallback(fallbackInputField)
  }

  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch((e: Error) => {
      if (fallbackInputField) {
        return copyToClipboardFallback(fallbackInputField, errorMessage)
      } else {
        throw e
      }
    })
}

type Milliseconds = number
type UnitKey = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'

type Units = {
  [key in UnitKey]: Milliseconds
}

const units: Units = {
  year: 24 * 60 * 60 * 1_000 * 365,
  month: (24 * 60 * 60 * 1_000 * 365) / 12,
  day: 24 * 60 * 60 * 1_000,
  hour: 60 * 60 * 1_000,
  minute: 60 * 1_000,
  second: 1_000,
}
const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export const timeElapsed = (d1: Milliseconds, d2: Milliseconds = Date.now()) => {
  const elapsedInMillis: Milliseconds = d1 - d2

  for (let k of Object.keys(units) as UnitKey[]) {
    const limit: number = units[k]
    if (Math.abs(elapsedInMillis) > limit) {
      return RELATIVE_TIME_FORMAT.format(Math.round(elapsedInMillis / limit), k)
    }
  }

  return RELATIVE_TIME_FORMAT.format(Math.round(elapsedInMillis / units['second']), 'second')
}
