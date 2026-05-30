/** services/operation-log.service.ts — 操作日志服务 (写入 operation_logs 表) */

import { db, schema } from '../shared/db'
import type { LogLevel } from '../shared/enums'

const { operationLogs } = schema

export interface OperationLogEntry {
  operator?: string
  spuCode?: string
  productId?: string
  action: string
  fieldName?: string
  oldValue?: string
  newValue?: string
  level: LogLevel
  message: string
}

/** 写入操作日志到数据库 */
export async function writeOperationLog(entry: OperationLogEntry): Promise<void> {
  try {
    await db.insert(operationLogs).values({
      operator: entry.operator || 'XP',
      spuCode: entry.spuCode || null,
      productId: entry.productId || null,
      action: entry.action,
      fieldName: entry.fieldName || null,
      oldValue: entry.oldValue || null,
      newValue: entry.newValue || null,
      level: entry.level,
      message: entry.message,
    })
  } catch (err) {
    console.error('[OperationLog] DB write failed:', err)
  }
}

// ── 便捷方法 ──

export const OperationLog = {
  info(entry: Omit<OperationLogEntry, 'level'>): Promise<void> {
    return writeOperationLog({ ...entry, level: 'info' })
  },
  success(entry: Omit<OperationLogEntry, 'level'>): Promise<void> {
    return writeOperationLog({ ...entry, level: 'success' })
  },
  warning(entry: Omit<OperationLogEntry, 'level'>): Promise<void> {
    return writeOperationLog({ ...entry, level: 'warning' })
  },
  error(entry: Omit<OperationLogEntry, 'level'>): Promise<void> {
    return writeOperationLog({ ...entry, level: 'error' })
  },
}
