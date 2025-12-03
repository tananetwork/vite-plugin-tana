/**
 * Blog API - Rails-style GET Handler
 *
 * Uses @tananetwork/db Rails-style model methods for ActiveRecord-like queries.
 *
 * Routes:
 *   GET /api/posts-rails         - List all posts with .all() or .where()
 *   GET /api/posts-rails/:id     - Get single post by ID with .find()
 */

import { model } from 'tana/db'
import { posts } from '../../blockchain/schema'
import { json, status } from 'tana/http'
import type { Request } from 'tana/net'

// Create the Post model (Rails-style)
const Post = model(posts)

export default async function handler(request: Request) {
  const params = request.params || {}

  // GET /api/posts-rails/:id - Find single post by primary key
  if (params.id) {
    const post = await Post.find(params.id)

    if (!post) {
      return status('notFound', { error: 'Post not found' })
    }

    // Access attributes directly through the proxy
    return json({
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

  // GET /api/posts-rails - List all posts, ordered by createdAt desc
  const allPosts = await Post.where({}).orderBy('createdAt', 'desc').all()

  // Get count using Rails-style count()
  const totalCount = await Post.count()

  return json({
    posts: allPosts.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      readTime: post.readTime,
      createdAt: post.createdAt,
    })),
    count: totalCount,
  })
}
