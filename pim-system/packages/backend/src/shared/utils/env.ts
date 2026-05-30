/** shared/utils/env.ts — 环境变量校验 (Zod) */

import { z } from 'zod/v4'
import { logger } from './logger'

const envSchema = z.object({
  // 数据库
  DATABASE_URL: z.string().min(1, 'DATABASE_URL 不能为空'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),

  // R2 存储
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_CUSTOM_DOMAIN: z.string().optional(),

  // 同步
  SYNC_INTERVAL_MINUTES: z.string().optional(),
  SYNC_CONCURRENCY: z.string().optional(),

  // 应用
  PORT: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
})

export type EnvConfig = z.infer<typeof envSchema>

let _env: EnvConfig | null = null

/** 加载并校验环境变量 (启动时调用一次) */
export function validateEnv(): EnvConfig {
  if (_env) return _env

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')

    logger.fatal({ errors: result.error.issues }, '环境变量校验失败')
    console.error(`\n环境变量校验失败:\n${errors}\n`)
    process.exit(1)
  }

  _env = result.data
  logger.info('环境变量校验通过')
  return _env
}

/** 获取已校验的环境变量 (必须先调用 validateEnv) */
export function getEnv(): EnvConfig {
  if (!_env) {
    return validateEnv()
  }
  return _env
}

/** 重置环境变量缓存 (仅测试使用) */
export function resetEnv(): void {
  _env = null
}
