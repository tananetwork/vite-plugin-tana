/**
 * Blog API - GET Handler
 *
 * Uses tana/db query builder for type-safe queries.
 *
 * Routes:
 *   GET /api       - List all posts
 *   GET /api/:id   - Get single post by ID
 */

import { db, eq, desc } from 'tana/db'
import { posts, type Post } from '../blockchain/schema'
import { json, status } from 'tana/http'
import type { Request } from 'tana/net'

export default async function handler(request: Request) {
  const params = request.params || {}

  // GET /api/:id - Single post
  if (params.id) {
    const results = await db
      .select()
      .from(posts)
      .where(eq(posts.id, params.id))
      .limit(1)

    if (results.length === 0) {
      return status('notFound', { error: 'Post not found' })
    }

    return json({
      post: formatPost(results[0]),
    })
  }

  // GET /api - List all posts
  const results = await db
    .select({
      id: posts.id,
      title: posts.title,
      excerpt: posts.excerpt,
      readTime: posts.readTime,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .orderBy(desc(posts.createdAt))

  return json({
    posts: results.map(formatPost),
    count: results.length,
  })
}

function formatPost(post: Partial<Post>) {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    readTime: post.readTime,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}
