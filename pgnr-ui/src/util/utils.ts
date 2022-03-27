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
