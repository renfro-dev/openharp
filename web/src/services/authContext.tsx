import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getUser, isUserAuthenticated } from './api'

interface User {
  id: string
  email: string
  displayName: string
  clickupListId?: string
  clickupTeamId?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  checkAuth: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      setIsLoading(true)
      const isAuth = await isUserAuthenticated()

      if (isAuth) {
        const userData = await getUser()
        setUser(userData)
        setError(null)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      setUser(null)
      setError(err instanceof Error ? err.message : 'Auth check failed')
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    // Clear local session
    setUser(null)

    // Redirect to login
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        checkAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
