/**
 * Migration: create posts
 * Generated: 2024-12-01T00:00:00.000Z
 *
 * Creates the posts table for the blog.
 */

export async function up(db: { execute: (sql: string) => Promise<void> }): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "posts" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" TEXT NOT NULL,
      "excerpt" TEXT,
      "content" TEXT,
      "read_time" TEXT DEFAULT '5 min read',
      "published_at" TIMESTAMPTZ,
      "created_at" TIMESTAMPTZ DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS "idx_posts_created_at" ON "posts" ("created_at" DESC);
  `)
}

export async function down(db: { execute: (sql: string) => Promise<void> }): Promise<void> {
  await db.execute(`
    DROP INDEX IF EXISTS "idx_posts_created_at";
    DROP TABLE IF EXISTS "posts";
  `)
}
