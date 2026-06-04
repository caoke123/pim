/**
 * Migration: Fix Distribution publicUrl format
 *
 * Upgrades all old URL formats to the E-Catalog page URL.
 *
 * Old formats fixed:
 *   1. https://catalog.yutu.nv315.top/d/{catalogId}
 *   2. https://yutu.nv315.top/d/{distributionId}
 *   3. https://yutu.nv315.top/distributions/{id}.json
 *
 * Target format:
 *   {ECATALOG_BASE_URL}/distributions/{distributionId}
 *
 * Run: npx tsx drizzle/0001_fix_distribution_public_url.ts
 */

import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://pim_user:pim_pass@localhost:5433/sorter'

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const eCatalogBase = process.env.ECATALOG_BASE_URL || 'http://localhost:3010'

    const updateResult = await client.query(`
      UPDATE distributions
      SET public_url = '${eCatalogBase}/distributions/' || id,
          updated_at = NOW()
      WHERE public_url NOT LIKE '%/distributions/%'
         OR public_url LIKE '%catalog.yutu%'
         OR public_url LIKE '%yutu.nv315.top%'
      RETURNING id, public_url
    `)

    const affectedRows = updateResult.rowCount ?? 0

    console.log('=== Distribution publicUrl Migration Report ===')
    console.log(`Affected rows: ${affectedRows}`)
    console.log('Updated rows:')
    for (const row of updateResult.rows) {
      console.log(`  ${row.id} → ${row.public_url}`)
    }

    await client.query('COMMIT')
    console.log('\nMigration committed successfully.')

    return affectedRows
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
  .then((rows) => {
    console.log(`\nDone. ${rows} distribution(s) updated.`)
    process.exit(0)
  })
  .catch(() => {
    process.exit(1)
  })
