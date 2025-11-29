import React from 'react'

const posts = [
  {
    id: 1,
    title: 'Getting Started with Tana',
    excerpt: 'Learn how to build your first decentralized application with Tana smart contracts.',
    date: '2024-01-15',
    readTime: '5 min read',
  },
  {
    id: 2,
    title: 'Understanding Smart Contracts',
    excerpt: 'A deep dive into how smart contracts work and why they matter for the future of the web.',
    date: '2024-01-10',
    readTime: '8 min read',
  },
  {
    id: 3,
    title: 'Building with TypeScript',
    excerpt: 'Why TypeScript is the perfect language for building reliable smart contracts.',
    date: '2024-01-05',
    readTime: '6 min read',
  },
]

function PostCard({ title, excerpt, date, readTime }: typeof posts[0]) {
  return (
    <article className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors cursor-pointer">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
        <time>{date}</time>
        <span>•</span>
        <span>{readTime}</span>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      <p className="text-slate-400">{excerpt}</p>
    </article>
  )
}

export function App() {
  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">My Blog</h1>
          <p className="text-slate-400 mt-1">Thoughts on code, design, and the decentralized web.</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-slate-500 text-sm">
          Built with Tana
        </div>
      </footer>
    </div>
  )
}
