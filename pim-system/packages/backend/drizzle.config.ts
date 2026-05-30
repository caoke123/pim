/** drizzle.config.ts — Drizzle Kit 配置 (v2, 指向新 schema 和真实DB) */

import type { Config } from 'drizzle-kit'

export default {
  schema: './src/shared/db/schema.ts',
  out: './src/shared/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://pim_user:pim_pass@localhost:5433/sorter',
  },
  verbose: true,
  strict: true,
} satisfies Config
