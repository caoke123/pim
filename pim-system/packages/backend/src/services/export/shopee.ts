/** packages/backend/src/services/export/shopee.ts — Shopee 平台导出服务 */

import ExcelJS from 'exceljs'
import { getExportData, type ExportProductData } from './base'

const HEADERS = [
  '商品名称', '商品描述', '类目', '卖家货号',
  '规格名称', '规格SKU', '重量(g)', '售价', '库存',
  '主图URL', 'SKU图URL',
]

export async function generateShopeeExcel(
  productIds: string[],
  options?: { priceMarkup?: number },
): Promise<Buffer> {
  const data = await getExportData(productIds, 'shopee')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Shopee 导入')

  // 表头
  const headerRow = sheet.addRow(HEADERS)
  headerRow.height = 24
  for (let i = 0; i < HEADERS.length; i++) {
    const cell = headerRow.getCell(i + 1)
    cell.font = { bold: true, size: 12, color: { argb: 'FF1E40AF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  }

  const markup = (options?.priceMarkup || 0) / 100

  // 数据行（每个 SKU 一行）
  let rowIndex = 1
  for (const prod of data) {
    for (const sku of prod.skus) {
      const row = sheet.addRow([
        prod.platformTitle || prod.title,
        prod.description || '',
        prod.platformCategory || prod.category || '',
        prod.productNo,
        sku.skuName,
        sku.skuCode,
        sku.weightG ?? '',
        (sku.sellingPrice != null ? sku.sellingPrice * (1 + markup) : ''),
        sku.stock ?? 0,
        prod.mainImageUrl || '',
        sku.imageUrl || '',
      ])

      // 斑马条纹
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

  // 自适应列宽
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
