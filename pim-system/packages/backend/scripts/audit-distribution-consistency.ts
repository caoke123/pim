/**
 * Distribution Consistency Audit Tool
 *
 * Usage: npx tsx scripts/audit-distribution-consistency.ts
 */

import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://pim_user:pim_pass@localhost:5433/sorter'

interface AuditResults {
  urlAudit: { correct: number; oldFormat: number; crossContaminated: number; nullUrl: number; details: string[] }
  priceAudit: { orphanDists: number; orphanSkus: number; spuMismatches: number; details: string[] }
  shareAudit: { exposedCustomerNames: number; details: string[] }
  lifecycleAudit: { staleInactive: number; details: string[] }
}

async function audit() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()

  const results: AuditResults = {
    urlAudit: { correct: 0, oldFormat: 0, crossContaminated: 0, nullUrl: 0, details: [] },
    priceAudit: { orphanDists: 0, orphanSkus: 0, spuMismatches: 0, details: [] },
    shareAudit: { exposedCustomerNames: 0, details: [] },
    lifecycleAudit: { staleInactive: 0, details: [] },
  }

  try {
    // ── 1. URL Audit ──
    const { rows: urlRows } = await client.query(`
      SELECT
        id,
        catalog_id,
        public_url,
        CASE
          WHEN public_url IS NULL THEN 'NULL_URL'
          WHEN public_url LIKE '%catalog.yutu%' THEN 'OLD_FORMAT'
          WHEN id::text = substring(public_url from '/d/([^/]*)$') THEN 'CORRECT'
          ELSE 'MISMATCH'
        END AS status
      FROM distributions
      ORDER BY status, id
    `)

    for (const row of urlRows) {
      switch (row.status) {
        case 'CORRECT': results.urlAudit.correct++; break
        case 'OLD_FORMAT': results.urlAudit.oldFormat++; break
        case 'NULL_URL': results.urlAudit.nullUrl++; break
        default: results.urlAudit.crossContaminated++; break
      }
      if (row.status !== 'CORRECT') {
        results.urlAudit.details.push(`  ${row.id}: ${row.status} → ${row.public_url}`)
      }
    }

    // CROSS_CONTAMINATED check: catalog_id != URL catalog
    const { rows: xcRows } = await client.query(`
      SELECT d.id, d.catalog_id, d.public_url,
             substring(d.public_url from '/d/([^/]*)$') AS url_catalog
      FROM distributions d
      WHERE d.public_url IS NOT NULL
        AND d.public_url LIKE '%catalog.yutu%'
        AND d.catalog_id::text != substring(d.public_url from '/d/([^/]*)$')
    `)
    for (const row of xcRows) {
      results.urlAudit.details.push(`  CROSS_CONTAMINATED: ${row.id} (catalog_id=${row.catalog_id}, url→${row.url_catalog})`)
    }

    // ── 2. Price Audit ──
    const { rows: orphanDistRows } = await client.query(`
      SELECT dsp.id, dsp.distribution_id, dsp.sku_id
      FROM distribution_sku_prices dsp
      LEFT JOIN distributions d ON d.id = dsp.distribution_id
      WHERE d.id IS NULL
    `)
    results.priceAudit.orphanDists = orphanDistRows.length
    for (const row of orphanDistRows) {
      results.priceAudit.details.push(`  Orphan price for missing distribution: ${row.id} → dist_id=${row.distribution_id}`)
    }

    const { rows: orphanSkuRows } = await client.query(`
      SELECT dsp.id, dsp.distribution_id, dsp.sku_id
      FROM distribution_sku_prices dsp
      LEFT JOIN product_skus ps ON ps.id = dsp.sku_id
      WHERE ps.id IS NULL
    `)
    results.priceAudit.orphanSkus = orphanSkuRows.length
    for (const row of orphanSkuRows) {
      results.priceAudit.details.push(`  Orphan price for missing SKU: ${row.id} → sku_id=${row.sku_id}`)
    }

    const { rows: spuRows } = await client.query(`
      SELECT dsp.id, dsp.distribution_id, dsp.sku_id, dsp.spu_code AS price_spu,
             ps.spu_code AS sku_spu
      FROM distribution_sku_prices dsp
      LEFT JOIN product_skus ps ON ps.id = dsp.sku_id
      WHERE ps.id IS NOT NULL AND dsp.spu_code != ps.spu_code
    `)
    results.priceAudit.spuMismatches = spuRows.length
    for (const row of spuRows) {
      results.priceAudit.details.push(`  SPU mismatch: ${row.id} → price_spu=${row.price_spu}, sku_spu=${row.sku_spu}`)
    }

    // ── 3. Share API Audit ──
    const { rows: shareRows } = await client.query(`
      SELECT id, show_customer_name
      FROM distributions
      WHERE status = 'active' AND show_customer_name = true
    `)
    results.shareAudit.exposedCustomerNames = shareRows.length
    for (const row of shareRows) {
      results.shareAudit.details.push(`  Active distribution with show_customer_name=true: ${row.id}`)
    }

    // ── 4. Lifecycle Audit ──
    const { rows: staleRows } = await client.query(`
      SELECT id, status, updated_at
      FROM distributions
      WHERE status = 'inactive'
        AND updated_at < NOW() - INTERVAL '7 days'
      ORDER BY updated_at
    `)
    results.lifecycleAudit.staleInactive = staleRows.length
    for (const row of staleRows) {
      results.lifecycleAudit.details.push(`  Stale inactive (>7d): ${row.id} — last updated ${row.updated_at}`)
    }

    // ── Health Score ──
    const totalDists = urlRows.length
    const urlScore = totalDists > 0 ? Math.round((results.urlAudit.correct / totalDists) * 40) : 0
    const priceScore = (results.priceAudit.orphanDists + results.priceAudit.orphanSkus + results.priceAudit.spuMismatches) === 0 ? 30 : 0
    const shareScore = 15
    const lifecycleScore = Math.max(0, 15 - results.lifecycleAudit.staleInactive * 2)
    const healthScore = Math.min(100, urlScore + priceScore + shareScore + lifecycleScore)

    // ── Print Report ──
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('   Distribution Consistency Report')
    console.log('═══════════════════════════════════════════════════════════════\n')
    console.log(`Health Score: ${healthScore}/100\n`)

    console.log('── URL Audit ──')
    console.log(`  Correct:     ${results.urlAudit.correct}`)
    console.log(`  Old Format:  ${results.urlAudit.oldFormat}`)
    console.log(`  Cross-Cont:  ${results.urlAudit.crossContaminated}`)
    console.log(`  NULL URL:    ${results.urlAudit.nullUrl}`)
    if (results.urlAudit.details.length > 0) {
      console.log('  Details:')
      results.urlAudit.details.forEach(d => console.log(d))
    }
    console.log()

    console.log('── Price Audit ──')
    console.log(`  Orphan (missing dist):    ${results.priceAudit.orphanDists}`)
    console.log(`  Orphan (missing SKU):     ${results.priceAudit.orphanSkus}`)
    console.log(`  SPU code mismatches:      ${results.priceAudit.spuMismatches}`)
    if (results.priceAudit.details.length > 0) {
      console.log('  Details:')
      results.priceAudit.details.forEach(d => console.log(d))
    }
    console.log()

    console.log('── Share Audit ──')
    console.log(`  Active with exposed customerName: ${results.shareAudit.exposedCustomerNames}`)
    if (results.shareAudit.details.length > 0) {
      console.log('  Details:')
      results.shareAudit.details.forEach(d => console.log(d))
    }
    console.log()

    console.log('── Cleanup Candidates ──')
    console.log(`  Stale inactive (>7 days): ${results.lifecycleAudit.staleInactive}`)
    if (results.lifecycleAudit.details.length > 0) {
      console.log('  Details:')
      results.lifecycleAudit.details.forEach(d => console.log(d))
    }
    console.log()

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('Report complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

audit()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
