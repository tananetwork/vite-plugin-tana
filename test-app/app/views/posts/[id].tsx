import React, { useState } from 'react'

interface Props {
  url?: string
}

export default function PostShow({ url }: Props) {
  const [liked, setLiked] = useState(false)

  // Extract ID from URL (in real app, would come from params)
  const id = url?.split('/').pop() || '1'

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <a href="/posts" style={{ color: '#1976d2' }}>&larr; Back to Posts</a>

      <article style={{ marginTop: '1rem' }}>
        <h1>Post #{id}</h1>
        <p style={{ color: '#666' }}>
          Route: <code>{url}</code>
        </p>

        <div style={{ marginTop: '2rem', lineHeight: 1.6 }}>
          <p>
            This is a dynamic route! The ID <code>{id}</code> was extracted from the URL.
          </p>
          <p>
            In a real application, the controller would fetch this post from the database
            using the Active Record pattern:
          </p>
          <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
{`// app/controllers/posts.ts
async show() {
  const post = await Post.find(this.params.id)
  return this.render('posts/show', { post })
}`}
          </pre>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3e0', borderRadius: '8px' }}>
          <h3>Interactive Test</h3>
          <button
            onClick={() => setLiked(!liked)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              background: liked ? '#e91e63' : '#9e9e9e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            {liked ? '❤️ Liked' : '🤍 Like this post'}
          </button>
        </div>
      </article>
    </div>
  )
}
