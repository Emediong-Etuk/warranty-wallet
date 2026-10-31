import { AppwriteException, ID, type Models } from 'appwrite'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { account, isConfigured } from './appwrite'

type User = Models.User<Models.Preferences>

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

function isSessionAlreadyActive(err: unknown): boolean {
  return (
    err instanceof AppwriteException &&
    (err.type === 'user_session_already_exists' || /session is active/i.test(err.message))
  )
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) return
    account
      .get()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession({ email, password })
    } catch (err) {
      if (!isSessionAlreadyActive(err)) throw err
      // A session already exists in this browser (e.g. from an earlier login
      // whose response never reached the page). Use it if it belongs to this
      // email; otherwise sign it out and log in fresh.
      const current = await account.get().catch(() => null)
      if (current && current.email.toLowerCase() === email.trim().toLowerCase()) {
        setUser(current)
        return
      }
      await account.deleteSession({ sessionId: 'current' }).catch(() => undefined)
      try {
        await account.createEmailPasswordSession({ email, password })
      } catch (retryErr) {
        if (!isSessionAlreadyActive(retryErr)) throw retryErr
        // Last resort: forget the stale session the SDK keeps in localStorage
        // (used when the browser blocks third-party cookies) and try again.
        window.localStorage.removeItem('cookieFallback')
        await account.createEmailPasswordSession({ email, password })
      }
    }
    setUser(await account.get())
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await account.create({ userId: ID.unique(), email, password, name })
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    await account.deleteSession({ sessionId: 'current' }).catch(() => undefined)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
