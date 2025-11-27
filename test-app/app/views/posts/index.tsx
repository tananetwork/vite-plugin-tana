import React from 'react'

interface Props {
  url?: string
}

// Mock data - in real app would come from controller/loader
const posts = [
  { id: 1, title: 'Getting Started with Tana', author: 'Admin' },
  { id: 2, title: 'Building Your First Store', author: 'Admin' },
  { id: 3, title: 'Advanced Blockchain Integration', author: 'Dev Team' },
]

export default function PostsIndex({ url }: Props) {
  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Blog Posts</h1>
      <p style={{ color: '#666' }}>
        Route: <code>{url || '/posts'}</code>
      </p>

      <div style={{ marginTop: '2rem' }}>
        {posts.map(post => (
          <article
            key={post.id}
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              background: '#f5f5f5',
              borderRadius: '8px'
            }}
          >
            <h2 style={{ margin: 0 }}>
              <a href={`/posts/${post.id}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                {post.title}
              </a>
            </h2>
            <p style={{ margin: '0.5rem 0 0', color: '#666' }}>
              By {post.author}
            </p>
          </article>
        ))}
      </div>

      <a href="/" style={{ color: '#1976d2' }}>&larr; Back to Home</a>
    </div>
  )
}
