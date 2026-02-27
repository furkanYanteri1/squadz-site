'use client'

import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  invitedById: string
}

export default function InviteDialog({ open, onClose, invitedById }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  if (!open) return null

  const handleSendInvite = async () => {
    setError(null)
    setLoading(true)
    setInviteUrl(null)

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          invited_by: invitedById 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send invite')
        setLoading(false)
        return
      }

      setSuccess(true)
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl)
      }
      
      // Auto-close sadece invite URL yoksa
      if (!data.inviteUrl) {
        setTimeout(() => {
          handleClose()
        }, 2000)
      }

    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setEmail('')
      setError(null)
      setSuccess(false)
      setInviteUrl(null)
      onClose()
    }
  }

  const copyToClipboard = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-bold mb-4 text-white">Send Invite</h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && !inviteUrl && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 p-3 rounded mb-4">
            ✓ Invite sent successfully!
          </div>
        )}

        {inviteUrl && (
          <div className="bg-blue-500/20 border border-blue-500 text-blue-200 p-3 rounded mb-4">
            <p className="font-semibold mb-2">✓ Invite created!</p>
            <p className="text-xs mb-2">Share this link with {email}:</p>
            <div className="bg-gray-900 p-2 rounded text-xs break-all mb-2">
              {inviteUrl}
            </div>
            <button
              onClick={copyToClipboard}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-sm"
            >
              Copy Link
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
              className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 disabled:opacity-50"
              onKeyDown={(e) => e.key === 'Enter' && !success && handleSendInvite()}
            />
          </div>

          <div className="flex space-x-2">
            {!inviteUrl && (
              <button
                onClick={handleSendInvite}
                disabled={loading || success}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-medium transition-colors"
              >
                {loading ? 'Creating...' : success ? 'Created!' : 'Create Invite'}
              </button>
            )}
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              {inviteUrl ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}