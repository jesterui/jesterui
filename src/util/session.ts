const SESSION_KEY = 'jester-ui'

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export type SessionItem = {
  privateKey: Hex | null
  [key: string]: Json
}

export const setSession = (session: SessionItem) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

export const setSessionAttribute = (item: SessionItem) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...getSession(), ...item }))
}

export const getSession = (): SessionItem | null => {
  const json = sessionStorage.getItem(SESSION_KEY)
  const item: SessionItem | null = (json && JSON.parse(json)) || null
  if (item) {
    return { ...item }
  } else {
    clearSession()
    return null
  }
}

export const clearSession = () => sessionStorage.removeItem(SESSION_KEY)
