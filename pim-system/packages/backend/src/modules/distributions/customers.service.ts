/** modules/distributions/customers.service.ts — 客户管理业务逻辑 */

import { eq, ne, desc, count, asc } from 'drizzle-orm'
import { db, schema } from '../../shared/db'
import { NotFoundError, BusinessError, ErrorCode } from '../../shared/utils/errors'
import type { CustomerRow, CustomerInsert } from '../../shared/types/db'
import { triggerDeploy } from '../../services/trigger-deploy'

const { customers } = schema

export interface CustomerListItem {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  wechat: string | null
  notes: string | null
  status: string
  operator: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerDTO {
  name: string
  contactPerson?: string
  phone?: string
  wechat?: string
  notes?: string
}

export interface UpdateCustomerDTO {
  name?: string
  contactPerson?: string
  phone?: string
  wechat?: string
  notes?: string
}

function toListItem(row: CustomerRow): CustomerListItem {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contactPerson ?? null,
    phone: row.phone ?? null,
    wechat: row.wechat ?? null,
    notes: row.notes ?? null,
    status: row.status,
    operator: row.operator ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

export class CustomersService {
  async getList(page: number, pageSize: number): Promise<{
    items: CustomerListItem[]
    total: number
    page: number
    pageSize: number
  }> {
    const [countResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(ne(customers.status, 'inactive'))
    const total = countResult?.count ?? 0

    const rows = await db
      .select()
      .from(customers)
      .where(ne(customers.status, 'inactive'))
      .orderBy(desc(customers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    return {
      items: rows.map(toListItem),
      total,
      page,
      pageSize,
    }
  }

  async getById(id: string): Promise<CustomerRow | null> {
    const [row] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1)
    return row ?? null
  }

  async create(dto: CreateCustomerDTO): Promise<CustomerRow> {
    if (!dto.name || !dto.name.trim()) {
      throw new BusinessError(ErrorCode.VALIDATION, '客户名称不能为空')
    }
    const insert: CustomerInsert = {
      name: dto.name.trim(),
      contactPerson: dto.contactPerson?.trim() || null,
      phone: dto.phone?.trim() || null,
      wechat: dto.wechat?.trim() || null,
      notes: dto.notes?.trim() || null,
      status: 'active',
      operator: 'XP',
    }
    const [row] = await db.insert(customers).values(insert).returning()
    return row
  }

  async update(id: string, dto: UpdateCustomerDTO): Promise<{ row: CustomerRow | null; deployId: string | null }> {
    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1)
    if (!existing) return { row: null, deployId: null }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BusinessError(ErrorCode.VALIDATION, '客户名称不能为空')
      updateData.name = dto.name.trim()
    }
    if (dto.contactPerson !== undefined) updateData.contactPerson = dto.contactPerson?.trim() || null
    if (dto.phone !== undefined) updateData.phone = dto.phone?.trim() || null
    if (dto.wechat !== undefined) updateData.wechat = dto.wechat?.trim() || null
    if (dto.notes !== undefined) updateData.notes = dto.notes?.trim() || null

    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning()

    // 客户信息变更后自动触发 Cloudflare Pages 部署
    let deployId: string | null = null
    try {
      const result = await triggerDeploy()
      deployId = result.deployId
    } catch (err) {
      console.error('触发 Cloudflare 部署失败:', err instanceof Error ? err.message : String(err))
    }

    return { row: updated ?? null, deployId }
  }

  async softDelete(id: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1)
    if (!existing) return false
    await db
      .update(customers)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(customers.id, id))
    return true
  }
}

export const customersService = new CustomersService()
