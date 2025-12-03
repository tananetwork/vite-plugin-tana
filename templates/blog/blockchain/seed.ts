/**
 * Database Seed Script
 *
 * Run with: npm run db:seed
 * Requires: DATABASE_URL environment variable
 */

import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

const seedPosts = [
  {
    title: 'Getting Started with Tana',
    excerpt: 'Learn how to build your first decentralized application with Tana smart contracts.',
    content: `
# Getting Started with Tana

Tana is a blockchain platform for better commerce. Think "Shopify, but on-chain."

## Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- PostgreSQL database

## Quick Start

1. Create a new project:
   \`\`\`bash
   npx create-tana-app my-blog --template blog
   \`\`\`

2. Set up your database:
   \`\`\`bash
   export DATABASE_URL="postgres://..."
   npm run db:migrate
   \`\`\`

3. Start developing:
   \`\`\`bash
   npm run dev
   \`\`\`

Happy building!
    `.trim(),
    read_time: '5 min read',
  },
  {
    title: 'Understanding Smart Contracts',
    excerpt: 'A deep dive into how smart contracts work and why they matter for the future of the web.',
    content: `
# Understanding Smart Contracts

Smart contracts are self-executing programs that run on a blockchain.

## Key Concepts

- **Immutability**: Once deployed, the code cannot be changed
- **Transparency**: Anyone can verify the contract's behavior
- **Automation**: Contracts execute automatically when conditions are met

## Tana's Approach

Tana uses TypeScript for smart contracts, making them accessible to web developers.
    `.trim(),
    read_time: '8 min read',
  },
  {
    title: 'Building with TypeScript',
    excerpt: 'Why TypeScript is the perfect language for building reliable smart contracts.',
    content: `
# Building with TypeScript

TypeScript brings type safety and developer experience to smart contract development.

## Benefits

- Catch errors at compile time
- Better IDE support with autocomplete
- Self-documenting code with types

## Example

\`\`\`typescript
import { query } from 'tana/db'

interface Post {
  id: string
  title: string
}

const posts = await query<Post>('SELECT * FROM posts')
\`\`\`
    `.trim(),
    read_time: '6 min read',
  },
]

async function seed() {
  console.log('Seeding database...')

  for (const post of seedPosts) {
    await sql`
      INSERT INTO posts (title, excerpt, content, read_time, published_at)
      VALUES (${post.title}, ${post.excerpt}, ${post.content}, ${post.read_time}, NOW())
      ON CONFLICT DO NOTHING
    `
    console.log(`  Created: ${post.title}`)
  }

  console.log('Done!')
  await sql.end()
}

seed().catch(console.error)
