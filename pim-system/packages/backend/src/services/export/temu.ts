/** packages/backend/src/services/export/temu.ts — Temu 平台导出服务 */

import ExcelJS from 'exceljs'
import { getExportData } from './base'

const HEADERS = [
  'Product Name', 'Description', 'Category', 'Seller SKU',
  'Variant Name', 'Variant SKU', 'Weight(g)', 'Price', 'Stock',
  'Main Image', 'Variant Image',
]

export async function generateTemuExcel(
  productIds: string[],
  options?: { priceMarkup?: number },
): Promise<Buffer> {
  const data = await getExportData(productIds, 'temu')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Temu 导入')

  // 表头
  const headerRow = sheet.addRow(HEADERS)
  headerRow.height = 24
  for (let i = 0; i < HEADERS.length; i++) {
    const cell = headerRow.getCell(i + 1)
    cell.font = { bold: true, size: 12, color: { argb: 'FF7C2D12' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  }

  const markup = (options?.priceMarkup || 0) / 100

  let rowIndex = 1
  for (const prod of data) {
    for (const sku of prod.skus) {
      const row = sheet.addRow([
        prod.platformTitle || prod.title,
        prod.description || '',
        prod.platformCategory || prod.category || '',
        sku.skuCode,
        sku.skuName,
        sku.skuCode,
        sku.weightG ?? '',
        (sku.sellingPrice != null ? sku.sellingPrice * (1 + markup) : ''),
        sku.stock ?? 0,
        prod.mainImageUrl || '',
        sku.imageUrl || '',
      ])

      if (rowIndex % 2 === 0) {
        for (let i = 0; i < HEADERS.length; i++) {
          row.getCell(i + 1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          }
        }
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        }
        cell.font = { size: 11 }
        cell.alignment = { vertical: 'middle' }
      })

      rowIndex++
    }
  }

  sheet.columns.forEach((col, i) => {
    const lengths: number[] = []
    sheet.eachRow((row) => {
      const cell = row.getCell(i + 1)
      lengths.push(String(cell.value || '').length)
    })
    const maxLen = Math.max(...lengths, HEADERS[i]?.length || 10)
    col.width = Math.max(12, Math.min(50, maxLen + 4))
  })

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
