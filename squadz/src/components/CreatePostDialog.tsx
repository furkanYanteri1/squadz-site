'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useUser } from '@/contexts/UserContext'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreatePostDialog({ open, onClose, onSuccess }: Props) {
  const supabase = createClient()
  const { user } = useUser()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const maxLength = 500

  if (!open) return null

  const handlePost = async () => {
    setError(null)
    setLoading(true)

    if (!content.trim()) {
      setError('Post cannot be empty')
      setLoading(false)
      return
    }

    if (content.length > maxLength) {
      setError(`Post is too long (max ${maxLength} characters)`)
      setLoading(false)
      return
    }

    if (!user?.team_id) {
      setError('You must be part of a team to post')
      setLoading(false)
      return
    }

    try {
      const { error: postError } = await supabase
        .from('posts')
        .insert([
          {
            content: content.trim(),
            team_id: user.team_id
          }
        ])

      if (postError) {
        setError('Failed to create post: ' + postError.message)
        setLoading(false)
        return
      }

      // Success!
      setContent('')
      setLoading(false)
      onSuccess()
      onClose()

    } catch (err: any) {
      console.error('Post creation error:', err)
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setContent('')
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Create Post</h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Posting as: <span className="font-semibold text-white">{user?.team_name}</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              placeholder="What's on your team's mind?"
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 disabled:opacity-50 resize-none h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={maxLength}
            />
            <div className="text-xs text-gray-400 mt-1 text-right">
              {content.length} / {maxLength}
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handlePost}
              disabled={loading || !content.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-medium transition-colors"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}