import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    env: {
      DATABASE_URL: 'postgresql://pim_user:pim_pass@127.0.0.1:5433/sorter',
      NODE_ENV: 'test',
    },
    pool: 'forks',
  },
})
