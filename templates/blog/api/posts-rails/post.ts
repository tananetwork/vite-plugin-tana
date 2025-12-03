/**
 * Blog API - Rails-style POST Handler
 *
 * Uses @tananetwork/db Rails-style model methods for ActiveRecord-like inserts.
 *
 * Routes:
 *   POST /api/posts-rails - Create a new post using Model.create()
 */

import { model } from 'tana/db'
import { posts, type NewPost } from '../../blockchain/schema'
import { status } from 'tana/http'
import type { Request } from 'tana/net'

// Create the Post model (Rails-style)
const Post = model(posts)

interface CreatePostBody {
  title: string
  excerpt?: string
  content?: string
  readTime?: string
}

export default async function handler(request: Request) {
  const body = request.body as CreatePostBody | undefined

  if (!body?.title) {
    return status('badRequest', {
      error: 'Missing required field: title',
    })
  }

  const { title, excerpt, content, readTime } = body

  // Calculate read time if not provided
  const estimatedReadTime = readTime || estimateReadTime(content || '')

  // Create the post using Rails-style Model.create()
  const newPostData: NewPost = {
    title,
    excerpt: excerpt || null,
    content: content || null,
    readTime: estimatedReadTime,
  }

  const post = await Post.create(newPostData)

  return status('created', {
    message: 'Post created successfully (Rails-style)',
    post: {
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      readTime: post.readTime,
      createdAt: post.createdAt,
    },
  })
}

function estimateReadTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
}
