/**
 * Blog API - POST Handler
 *
 * Uses tana/db query builder for type-safe inserts.
 *
 * Routes:
 *   POST /api - Create a new post
 */

import { db } from 'tana/db'
import { posts, type NewPost } from '../blockchain/schema'
import { status } from 'tana/http'
import type { Request } from 'tana/net'

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

  // Create the post using Drizzle-style insert
  const newPost: NewPost = {
    title,
    excerpt: excerpt || null,
    content: content || null,
    readTime: estimatedReadTime,
  }

  const results = await db
    .insert(posts)
    .values(newPost)
    .returning()

  if (results.length === 0) {
    return status('internalServerError', {
      error: 'Failed to create post',
    })
  }

  const post = results[0]

  return status('created', {
    message: 'Post created successfully',
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
