'use client'

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

interface Props {
  open: boolean
  inviteId: string
  onClose: () => void
  onSuccess: () => void
}

export default function AcceptInviteDialog({ open, inviteId, onClose, onSuccess }: Props) {
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [requireTeamName, setRequireTeamName] = useState(false)

  useEffect(() => {
    if (!open || !inviteId) return;

    const fetchInvite = async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('id', inviteId)
        .eq('status', 'pending')
        .single()

      if (error || !data) {
        setError('Invalid or expired invite')
        return
      }

      setInvite(data)

      // Eğer invite'da team_id null ise (superuser daveti), yeni takım adı gerekir
      if (!data.team_id) {
        setRequireTeamName(true)
        setTeamName('') // Kullanıcı yazacak
      } else {
        setRequireTeamName(false)
        // Takım adını göster (readonly)
        const { data: team } = await supabase
          .from('teams')
          .select('name')
          .eq('id', data.team_id)
          .single()
        
        if (team) {
          setTeamName(team.name)
        }
      }
    }

    fetchInvite()
  }, [open, inviteId])

  if (!open) return null

  const handleAccept = async () => {
    setError(null)
    setLoading(true)

    try {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      if (requireTeamName && (!teamName || teamName.trim().length < 2)) {
        setError('Team name must be at least 2 characters')
        setLoading(false)
        return
      }

      // 1. Kullanıcıyı signup yap (email confirmation DISABLED)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
          data: {
            email_confirm: true // Auto-confirm, email gönderme
          }
        }
      })

      let userId = authData?.user?.id

      if (signUpError) {
        // Eğer kullanıcı zaten varsa, sadece login yap
        if (signUpError.message.includes('already registered') || signUpError.message.includes('rate limit')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: invite.email,
            password
          })
          
          if (signInError) {
            setError('Invalid credentials or user already exists with different password')
            setLoading(false)
            return
          }
          
          userId = signInData?.user?.id
        } else {
          setError(signUpError.message)
          setLoading(false)
          return
        }
      }

      if (!userId) {
        setError('Failed to create user')
        setLoading(false)
        return
      }

      // 2. Eğer yeni takım gerekiyorsa oluştur
      let finalTeamId = invite.team_id

      if (requireTeamName) {
        // Takım adı kontrolü
        const { data: existingTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('name', teamName.trim())
          .single()

        if (existingTeam) {
          setError('Team name already exists, please choose another')
          setLoading(false)
          return
        }

        // Yeni takım oluştur
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert([{ name: teamName.trim() }])
          .select()
          .single()

        if (teamError) {
          setError('Failed to create team: ' + teamError.message)
          setLoading(false)
          return
        }

        finalTeamId = newTeam.id
      }

      // 3. Profile oluştur/güncelle
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          team_id: finalTeamId,
          invited_by: invite.invited_by,
          role: 'member'
        })

      if (profileError) {
        setError('Failed to create profile: ' + profileError.message)
        setLoading(false)
        return
      }

      // 4. Invite'ı accepted olarak işaretle
      await supabase
        .from('invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId)

      // Başarılı!
      setLoading(false)
      onSuccess()
      
    } catch (err: any) {
      console.error('Accept invite error:', err)
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-bold mb-4 text-white">Complete Your Account</h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Team Name Field */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => requireTeamName && setTeamName(e.target.value)}
              disabled={!requireTeamName}
              className={`w-full p-2 rounded border ${
                requireTeamName 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'
              }`}
              placeholder={requireTeamName ? "Enter your team name" : ""}
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
              placeholder="Min. 6 characters"
            />
            <p className="text-xs text-gray-400 mt-1">
              You'll use this email and password to login later
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-medium transition-colors"
          >
            {loading ? 'Creating account...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  )
}