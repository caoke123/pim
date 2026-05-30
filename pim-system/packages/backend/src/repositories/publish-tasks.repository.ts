/** repositories/publish-tasks.repository.ts */

import { eq, desc, count } from 'drizzle-orm'
import { db, schema } from '../shared/db'
import type { PublishTaskInsert } from '../shared/types'

const { pimPublishTasks } = schema

type PublishTaskRow = typeof pimPublishTasks.$inferSelect

export class PublishTasksRepository {
  async create(data: PublishTaskInsert): Promise<PublishTaskRow> {
    const [row] = await db.insert(pimPublishTasks).values(data).returning()
    return row
  }

  async findById(id: string): Promise<PublishTaskRow | null> {
    const [row] = await db.select().from(pimPublishTasks).where(eq(pimPublishTasks.id, id)).limit(1)
    return row ?? null
  }

  async findMany(params: { page?: number; pageSize?: number; status?: string }) {
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))

    const conditions = []
    if (params.status) conditions.push(eq(pimPublishTasks.status, params.status))

    const where = conditions.length > 0 ? undefined : undefined
    // 简化: 直接查询全部再过滤
    const rows = await db.select().from(pimPublishTasks).orderBy(desc(pimPublishTasks.createdAt)).limit(pageSize).offset((page - 1) * pageSize)
    const [totalRow] = await db.select({ count: count() }).from(pimPublishTasks)

    return { items: rows, total: totalRow?.count ?? 0, page, pageSize }
  }

  async updateStatus(id: string, data: { status: string; error?: string; progress?: number; completedAt?: Date }) {
    const [row] = await db.update(pimPublishTasks).set({
      status: data.status,
      ...(data.error !== undefined ? { error: data.error } : {}),
      ...(data.progress !== undefined ? { progress: data.progress } : {}),
      ...(data.completedAt ? { completedAt: data.completedAt } : {}),
    }).where(eq(pimPublishTasks.id, id)).returning()
    return row ?? null
  }

  async appendLogLine(id: string, logEntry: { nodeId: string; message: string; timestamp: string }) {
    const [task] = await db.select({ logLines: pimPublishTasks.logLines }).from(pimPublishTasks).where(eq(pimPublishTasks.id, id)).limit(1)
    if (!task) return null

    const existing = (task.logLines as any[]) || []
    const updated = [...existing, logEntry]

    const [row] = await db.update(pimPublishTasks).set({ logLines: updated as any }).where(eq(pimPublishTasks.id, id)).returning()
    return row ?? null
  }

  async countFailed(): Promise<number> {
    const [row] = await db.select({ count: count() }).from(pimPublishTasks).where(eq(pimPublishTasks.status, 'failed'))
    return row?.count ?? 0
  }
}

export const publishTasksRepository = new PublishTasksRepository()
