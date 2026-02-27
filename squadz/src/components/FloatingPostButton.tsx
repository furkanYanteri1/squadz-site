'use client'

import { useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import CreatePostDialog from './CreatePostDialog'

export default function FloatingPostButton() {
  const { user } = useUser()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Sadece team'i olan ve superuser OLMAYAN kullanıcılar görsün
  if (!user || !user.team_id || user.role === 'superuser') {
    return null
  }

  const handlePostSuccess = () => {
    // Window event dispatch - page.tsx dinliyor
    window.dispatchEvent(new Event('post-created'))
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 group"
        aria-label="Create post"
      >
        <svg 
          className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 4v16m8-8H4" 
          />
        </svg>
      </button>

      <CreatePostDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handlePostSuccess}
      />
    </>
  )
}