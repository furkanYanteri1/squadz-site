import { createClient } from '@/lib/supabase-server'

export default async function Home() {
  const supabase = createClient() // async değil, direkt client alıyoruz

  const { data: posts } = await supabase
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

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Squadz Feed</h1>

      {posts?.map((post) => (
        <div key={post.id} className="border rounded-xl p-4 space-y-2">
          <div className="font-semibold">{post.teams?.name}</div>
          <div>{post.content}</div>
          <div className="text-xs text-gray-500">
            {new Date(post.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </main>
  )
}