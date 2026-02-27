'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useUser } from '@/contexts/UserContext'

type FeedMode = 'all' | 'following'

interface Post {
  id: string
  content: string
  created_at: string
  team_id: string
  teams: {
    name: string
    avatar_url?: string
  } | null
}

export default function Home() {
  const supabase = createClient()
  const { user } = useUser()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [feedMode, setFeedMode] = useState<FeedMode>('all')
  const [followedTeams, setFollowedTeams] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState(false)

  // Takip edilen takımları ve postları birlikte yükle - race condition önlenir
  const loadData = useCallback(async () => {
    setLoading(true)

    // Önce followed teams'i yükle (eğer user varsa)
    let currentFollowedTeams = new Set<string>()
    if (user?.team_id) {
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_team_id')
        .eq('follower_team_id', user.team_id)

      if (followsData) {
        currentFollowedTeams = new Set(followsData.map(f => f.following_team_id))
        setFollowedTeams(currentFollowedTeams)
      }
    }

    // Sonra posts'ları yükle
    let query = supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        team_id,
        teams!inner (
          name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    // Eğer "following" mode'daysa, sadece takip edilen takımların postları
    if (feedMode === 'following' && user?.team_id) {
      const followedTeamIds = Array.from(currentFollowedTeams)
      if (followedTeamIds.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }
      query = query.in('team_id', followedTeamIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
    }

    // Type cast to handle Supabase's array response
    const postsData = (data as any)?.map((post: any) => ({
      ...post,
      teams: Array.isArray(post.teams) ? post.teams[0] : post.teams
    })) as Post[] || []

    setPosts(postsData)
    setLoading(false)
  }, [user, feedMode, supabase])

  // Data yükle - user veya feedMode değiştiğinde
  useEffect(() => {
    loadData()
  }, [loadData])

  // Follow/Unfollow handler - optimistic update ile
  const handleToggleFollow = async (teamId: string) => {
    if (!user?.team_id || followLoading) return

    setFollowLoading(true)
    const isFollowing = followedTeams.has(teamId)

    // Optimistic update - UI'ı hemen güncelle
    setFollowedTeams(prev => {
      const newSet = new Set(prev)
      if (isFollowing) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_team_id', user.team_id)
          .eq('following_team_id', teamId)

        if (error) {
          // Hata olursa geri al
          setFollowedTeams(prev => new Set([...prev, teamId]))
          console.error('Unfollow error:', error)
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_team_id: user.team_id,
            following_team_id: teamId
          })

        if (error) {
          // Hata olursa geri al
          setFollowedTeams(prev => {
            const newSet = new Set(prev)
            newSet.delete(teamId)
            return newSet
          })
          console.error('Follow error:', error)
        }
      }

      // Following mode'daysa posts'u yeniden yükle
      if (feedMode === 'following') {
        loadData()
      }
    } finally {
      setFollowLoading(false)
    }
  }

  // Post oluşturulduktan sonra refresh - reload yerine
  const handlePostCreated = useCallback(() => {
    console.log('🔄 New post created, refreshing feed...')
    loadData()
  }, [loadData])

  // Window event listener - CreatePostDialog'dan çağrılabilmesi için
  useEffect(() => {
    window.addEventListener('post-created', handlePostCreated)
    return () => window.removeEventListener('post-created', handlePostCreated)
  }, [handlePostCreated])

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6 pb-24">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-white">Squadz Feed</h1>
          
          {/* Toggle: ALL | Following (sadece logged in users için) */}
          {user && (
            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => setFeedMode('all')}
                disabled={loading}
                className={`px-4 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                  feedMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFeedMode('following')}
                disabled={loading}
                className={`px-4 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                  feedMode === 'following'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Following
              </button>
            </div>
          )}
        </div>

        <p className="text-gray-400 text-sm">
          {loading ? '...' : `${posts.length} posts`}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          Loading posts...
        </div>
      ) : !posts || posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">
            {feedMode === 'following' 
              ? 'No posts from teams you follow yet'
              : 'No posts yet'}
          </p>
          <p className="text-sm mt-2">
            {feedMode === 'following'
              ? 'Follow some teams to see their posts here!'
              : 'Be the first to share something!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isOwnTeam = user?.team_id === post.team_id
            const isFollowing = followedTeams.has(post.team_id)
            
            return (
              <article 
                key={post.id} 
                className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {post.teams?.avatar_url && (
                      <img 
                        src={post.teams.avatar_url} 
                        alt={post.teams.name}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="font-semibold text-white">
                          {post.teams?.name || 'Unknown Team'}
                        </div>
                      </div>
                      <div className="text-gray-200 whitespace-pre-wrap break-words">
                        {post.content}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(post.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Follow/Unfollow Button (sadece logged in ve kendi takımı değilse) */}
                  {user && !isOwnTeam && (
                    <button
                      onClick={() => handleToggleFollow(post.team_id)}
                      disabled={followLoading}
                      className={`ml-4 px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 ${
                        isFollowing
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
