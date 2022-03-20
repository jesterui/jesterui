const SESSION_KEY = 'pgnr-ui'

export interface SessionItem {
  name: string
}

export const setSession = (session: SessionItem) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

export const getSession = (): SessionItem | null => {
  const json = sessionStorage.getItem(SESSION_KEY)
  const { name }: any = (json && JSON.parse(json)) || {}
  if (name) {
    return { name }
  } else {
    clearSession()
    return null
  }
}

export const clearSession = () => sessionStorage.removeItem(SESSION_KEY)