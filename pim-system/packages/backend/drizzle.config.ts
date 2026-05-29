/** drizzle.config.ts — Drizzle Kit 配置 */

import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://pim_user:pim_pass@localhost:5432/pim_db',
  },
} satisfies Config
