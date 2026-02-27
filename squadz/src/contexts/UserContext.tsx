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
}

const UserContext = createContext<UserContextProps>({
  user: null,
  setUser: () => {},
  logout: async () => {},
  refreshUser: async () => {}
})

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async (supaUser: SupabaseUser) => {
    // Profile çek
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', supaUser.id)
      .single()

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

    return {
      id: supaUser.id,
      email: supaUser.email!,
      role: isSuperuser ? 'superuser' : 'member',
      team_id: profile?.team_id,
      team_name
    } as User
  }

  const refreshUser = async () => {
    try {
      const { data: { user: supaUser } } = await supabase.auth.getUser()
      
      if (supaUser) {
        const userData = await fetchUserData(supaUser)
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    }
  }

  useEffect(() => {
    // İlk yükleme
    refreshUser().finally(() => setLoading(false))

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userData = await fetchUserData(session.user)
        setUser(userData)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // İlk yükleme sırasında hiçbir şey render etme
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)