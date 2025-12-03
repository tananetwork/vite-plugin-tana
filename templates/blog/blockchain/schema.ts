/**
 * Blog Database Schema
 *
 * Uses @tananetwork/db for type-safe schema definitions.
 * Run `npm run db:migrate` to apply changes to your database.
 */

import { table, text, uuid, timestamp } from 'tana/db'

export const posts = table('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  readTime: text('read_time').default('5 min read'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Type exports for use in API handlers
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
