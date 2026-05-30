/** shared/utils/pagination.ts — 统一分页工具 */

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

/** 创建统一分页结果 */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    data: items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/** 安全解析分页参数 */
export function parsePagination(query: {
  page?: string | number
  pageSize?: string | number
}): { page: number; pageSize: number } {
  const rawPage = Number(query.page)
  const rawPageSize = Number(query.pageSize)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0
    ? Math.min(100, Math.floor(rawPageSize))
    : 20
  return { page, pageSize }
}

/** 生成 Link headers (可选, 标准 REST 分页) */
export function buildPaginationLinks(
  baseUrl: string,
  page: number,
  totalPages: number,
): string {
  const links: string[] = []

  const buildUrl = (p: number) => {
    const url = new URL(baseUrl)
    url.searchParams.set('page', String(p))
    return url.toString()
  }

  if (page < totalPages) {
    links.push(`<${buildUrl(page + 1)}>; rel="next"`)
    links.push(`<${buildUrl(totalPages)}>; rel="last"`)
  }
  if (page > 1) {
    links.push(`<${buildUrl(1)}>; rel="first"`)
    links.push(`<${buildUrl(page - 1)}>; rel="prev"`)
  }

  return links.join(', ')
}
