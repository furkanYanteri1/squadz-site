'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase-client'
import { User as SupabaseUser } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  role: 'superuser' | 'member'
  team_id?: string
  team_name?: string
}

interface UserContextProps {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  loading: boolean
}

const UserContext = createContext<UserContextProps>({
  user: null,
  setUser: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  loading: true
})

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async (supaUser: SupabaseUser): Promise<User | null> => {
    try {
      console.log('🔄 Fetching user data for:', supaUser.email)

      // Profile çek
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('id', supaUser.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        // Profile yoksa bile devam et
      }

      // Team adını çek (eğer varsa)
      let team_name: string | undefined = undefined
      if (profile?.team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select('name')
          .eq('id', profile.team_id)
          .single()
        team_name = team?.name
      }

      // Superuser kontrolü
      const isSuperuser = supaUser.email === process.env.NEXT_PUBLIC_SUPERUSER_EMAIL

      const userData = {
        id: supaUser.id,
        email: supaUser.email!,
        role: isSuperuser ? 'superuser' : 'member',
        team_id: profile?.team_id,
        team_name
      } as User

      console.log('✅ User data fetched:', userData)
      return userData

    } catch (error) {
      console.error('❌ Error fetching user data:', error)
      return null
    }
  }

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user...')
      const { data: { user: supaUser }, error } = await supabase.auth.getUser()
      
      if (error) {
        // AuthSessionMissingError normal - kullanıcı login olmamış
        if (error.message.includes('Auth session missing')) {
          console.log('ℹ️ No active session')
        } else {
          console.error('Auth error:', error)
        }
        setUser(null)
        return
      }

      if (supaUser) {
        const userData = await fetchUserData(supaUser)
        setUser(userData)
      } else {
        console.log('No authenticated user')
        setUser(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    }
  }

  useEffect(() => {
    console.log('🚀 UserContext mounting...')
    
    // Timeout ile ilk yükleme - 5 saniye içinde cevap gelmezse devam et
    const loadTimeout = setTimeout(() => {
      console.log('⚠️ Loading timeout - continuing anyway')
      setLoading(false)
    }, 5000)

    // İlk yükleme
    refreshUser()
      .finally(() => {
        clearTimeout(loadTimeout)
        setLoading(false)
        console.log('✅ UserContext loaded')
      })

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out')
        setUser(null)
      } else if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 User signed in')
        const userData = await fetchUserData(session.user)
        setUser(userData)
      } else if (session?.user) {
        const userData = await fetchUserData(session.user)
        setUser(userData)
      } else {
        setUser(null)
      }
    })

    return () => {
      console.log('👋 UserContext unmounting')
      subscription.unsubscribe()
      clearTimeout(loadTimeout)
    }
  }, [])

  const logout = async () => {
    try {
      console.log('🚪 Logging out...')
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
      }
      
      setUser(null)
      console.log('✅ Logged out successfully')
      
      // Küçük delay sonra reload - session temizlensin
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
      
    } catch (error) {
      console.error('Logout exception:', error)
      setUser(null)
      window.location.href = '/'
    } finally {
      setLoading(false)
    }
  }

  // İlk yükleme sırasında loading göster
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <div className="text-white">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout, refreshUser, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)