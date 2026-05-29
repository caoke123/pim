/** src/load-env.ts — 在所有模块之前加载环境变量 */

import dotenv from 'dotenv'
import { resolve } from 'path'

// pnpm 脚本从各 package 目录执行，monorepo 根目录在上两级
dotenv.config({ path: resolve(process.cwd(), '../../.env') })

if (!process.env.DATABASE_URL) {
  console.error('无法加载 .env 文件，请确认 pim-system/.env 文件存在')
  process.exit(1)
}
