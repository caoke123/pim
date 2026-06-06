/** packages/backend/src/services/supabase-sync.ts — Docker → Supabase 定时同步 */
import { Pool } from 'pg'
import { logger } from '../shared/utils/logger'

const SYNC_TABLES = [
  { name: 'products', conflictCol: 'spu_code', conflictType: 'constraint' as const },
  { name: 'product_skus', conflictCol: 'sku_code', conflictType: 'constraint' as const },
  { name: 'catalogs', conflictCol: 'id', conflictType: 'pk' as const },
  { name: 'customers', conflictCol: 'id', conflictType: 'pk' as const },
  { name: 'distributions', conflictCol: 'id', conflictType: 'pk' as const },
  { name: 'distribution_sku_prices', conflictCol: 'id', conflictType: 'pk' as const },
]

function getPool(connectionString: string, label: string): Pool {
  const ssl = connectionString.includes('supabase')
  return new Pool({
    connectionString,
    ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}),
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  })
}

export async function startSupabaseSync(): Promise<void> {
  const dockerUrl = process.env.DATABASE_URL
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL
  const intervalMs = Number(process.env.SUPABASE_SYNC_INTERVAL_MS) || 5000

  if (!dockerUrl || !supabaseUrl) {
    logger.warn('Supabase 同步未启动: DATABASE_URL 或 SUPABASE_DATABASE_URL 未配置')
    return
  }

  logger.info({ intervalMs }, 'Supabase 同步服务启动')

  const dockerDb = getPool(dockerUrl, 'Docker')
  const supabaseDb = getPool(supabaseUrl, 'Supabase')

  // 启动时执行一次全量同步
  await runFullSync(dockerDb, supabaseDb)

  // 定时增量同步
  setInterval(async () => {
    try {
      await runIncrementalSync(dockerDb, supabaseDb)
    } catch (err) {
      logger.error(err, 'Supabase 定时同步失败')
    }
  }, intervalMs)
}

async function runFullSync(dockerDb: Pool, supabaseDb: Pool): Promise<void> {
  logger.info('执行 Supabase 全量同步...')
  for (const table of SYNC_TABLES) {
    try {
      const { rows } = await dockerDb.query(`SELECT * FROM ${table.name}`)
      if (rows.length === 0) continue

      await supabaseSync(supabaseDb, table.name, rows, table.conflictCol, table.conflictType)
      // 更新最后同步时间
      await dockerDb.query(
        `INSERT INTO sync_state (table_name, last_sync) VALUES ($1, NOW()) ON CONFLICT (table_name) DO UPDATE SET last_sync = NOW()`,
        [table.name]
      )
      logger.info(`全量同步 ${table.name}: ${rows.length} 行`)
    } catch (err) {
      logger.error(err, `全量同步 ${table.name} 失败`)
    }
  }
  logger.info('Supabase 全量同步完成')
}

async function runIncrementalSync(dockerDb: Pool, supabaseDb: Pool): Promise<void> {
  for (const table of SYNC_TABLES) {
    try {
      const { rows: [state] } = await dockerDb.query(
        'SELECT last_sync FROM sync_state WHERE table_name = $1', [table.name]
      )
      const lastSync = state?.last_sync || '1970-01-01'

      const { rows } = await dockerDb.query(
        `SELECT * FROM ${table.name} WHERE updated_at > $1 ORDER BY updated_at`,
        [lastSync]
      )
      if (rows.length === 0) continue

      await supabaseSync(supabaseDb, table.name, rows, table.conflictCol, table.conflictType)

      await dockerDb.query(
        `INSERT INTO sync_state (table_name, last_sync) VALUES ($1, NOW()) ON CONFLICT (table_name) DO UPDATE SET last_sync = NOW()`,
        [table.name]
      )
    } catch (err) {
      logger.error(err, `增量同步 ${table.name} 失败`)
    }
  }
}

async function supabaseSync(
  db: Pool,
  table: string,
  rows: Record<string, unknown>[],
  conflictCol: string,
  conflictType: 'constraint' | 'pk'
): Promise<void> {
  if (rows.length === 0) return

  // 批量 UPSERT：每批100行
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const cols = Object.keys(batch[0])
    const values: unknown[] = []
    const paramRefs: string[] = []

    batch.forEach((row, ri) => {
      const refs = cols.map((_, ci) => `$${ri * cols.length + ci + 1}`)
      paramRefs.push(`(${refs.join(', ')})`)
      cols.forEach((c) => values.push(row[c]))
    })

    const colNames = cols.map((c) => `"${c}"`).join(', ')
    const conflictTarget = conflictType === 'pk' ? `("${conflictCol}")` : conflictCol
    const setClause = cols
      .filter((c) => c !== conflictCol)
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(', ')

    const sql = `
      INSERT INTO "${table}" (${colNames})
      VALUES ${paramRefs.join(', ')}
      ON CONFLICT (${conflictTarget}) DO UPDATE SET ${setClause}
    `

    await db.query(sql, values)
  }
}
