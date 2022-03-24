export const arrayEquals = (a: any, b: any): boolean => {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => (Array.isArray(val) ? arrayEquals(val, b[index]) : val === b[index]))
  )
}
