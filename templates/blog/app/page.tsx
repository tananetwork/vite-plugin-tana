import { useState, useEffect } from 'react'
import type { Post as SchemaPost } from '../blockchain/schema'

// JSON API serializes Date fields as ISO strings
type Post = {
  [K in keyof SchemaPost]: SchemaPost[K] extends Date
    ? string
    : SchemaPost[K] extends Date | null
    ? string | null
    : SchemaPost[K]
}

interface ApiResponse {
  posts: Post[]
  count: number
}

function PostCard({ post }: { post: Post }) {
  const date = new Date(post.publishedAt || post.createdAt)
  const formattedDate = date.toISOString().split('T')[0]

  return (
    <article className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors cursor-pointer">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
        <time>{formattedDate}</time>
        <span>-</span>
        <span>{post.readTime}</span>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">{post.title}</h2>
      {post.excerpt && (
        <p className="text-slate-400">{post.excerpt}</p>
      )}
    </article>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-white mb-2">No posts yet</h2>
      <p className="text-slate-400 mb-4">
        Create your first post using the API:
      </p>
      <pre className="bg-slate-800 rounded-lg p-4 text-left text-sm text-slate-300 overflow-x-auto">
{`curl -X POST http://localhost:5173/api \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "My First Post",
    "excerpt": "This is my first blog post!",
    "content": "Full content here..."
  }'`}
      </pre>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 bg-slate-700 rounded w-24" />
            <div className="h-4 bg-slate-700 rounded w-16" />
          </div>
          <div className="h-6 bg-slate-700 rounded w-3/4 mb-2" />
          <div className="h-4 bg-slate-700 rounded w-full" />
        </div>
      ))}
    </div>
  )
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch('/api')
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }
        const data: ApiResponse = await response.json()
        setPosts(data.posts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">My Blog</h1>
          <p className="text-slate-400 mt-1">Thoughts on code, design, and the decentralized web.</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error loading posts</h2>
            <p className="text-slate-400">{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-slate-500 text-sm">
          Built with Tana{!loading && ` - ${posts.length} post${posts.length !== 1 ? 's' : ''}`}
        </div>
      </footer>
    </div>
  )
}
