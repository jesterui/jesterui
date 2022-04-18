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
