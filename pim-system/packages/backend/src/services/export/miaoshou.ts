/** packages/backend/src/services/export/miaoshou.ts — 妙手ERP 平台导出服务 */

import ExcelJS from 'exceljs'
import { getExportData } from './base'

const HEADERS = [
  '* 产品标题', '货币类型', '货源链接', '货源平台',
  '产品主编号', '详情描述', '货源类目', '属性',
  'SKU规格1', 'SKU规格2', '平台SKU', '* SKU售价',
  'SKU库存', 'SKU重量(KG)', 'SKU尺寸(CM)',
]

export async function generateMiaoshouExcel(
  productIds: string[],
  options?: { priceMarkup?: number },
): Promise<Buffer> {
  const data = await getExportData(productIds, 'miaoshou')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('妙手ERP 导入')

  // 表头
  const headerRow = sheet.addRow(HEADERS)
  headerRow.height = 24
  for (let i = 0; i < HEADERS.length; i++) {
    const cell = headerRow.getCell(i + 1)
    const isRequired = HEADERS[i].startsWith('*')
    cell.font = {
      bold: true,
      size: 12,
      color: { argb: isRequired ? 'FF166534' : 'FF065F46' },
    }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
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
    // 平台属性拼接
    let attributesStr = ''
    if (prod.platformAttributes && typeof prod.platformAttributes === 'object') {
      attributesStr = Object.entries(prod.platformAttributes as Record<string, string>)
        .map(([k, v]) => `${k}:${v}`)
        .join('；')
    }

    for (const sku of prod.skus) {
      const row = sheet.addRow([
        prod.title,
        'CNY',
        '',
        '',
        prod.productNo,
        prod.description || '',
        prod.category || '',
        attributesStr,
        sku.skuName,
        '',
        sku.skuCode,
        (sku.sellingPrice != null ? sku.sellingPrice * (1 + markup) : 0),
        sku.stock ?? 0,
        sku.weightG != null ? (sku.weightG / 1000).toFixed(3) : '',
        sku.size || '',
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
