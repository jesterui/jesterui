export const arrayEquals = (a: any, b: any): boolean => {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index])
}
