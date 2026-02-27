import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      teams (
        name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching posts:', error)
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Squadz Feed</h1>
        <p className="text-gray-400 text-sm">
          {posts?.length || 0} posts
        </p>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No posts yet</p>
          <p className="text-sm mt-2">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article 
              key={post.id} 
              className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start space-x-3">
                {post.teams?.avatar_url && (
                  <img 
                    src={post.teams.avatar_url} 
                    alt={post.teams.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white mb-1">
                    {post.teams?.name || 'Unknown Team'}
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
            </article>
          ))}
        </div>
      )}
    </main>
  )
}