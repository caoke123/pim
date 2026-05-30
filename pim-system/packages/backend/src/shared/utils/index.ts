/** shared/utils/index.ts — 工具函数统一导出 */

export { ok, okPaginated, fail, notFound, serverError } from './response'
export type { UnifiedResponse, PaginatedData } from './response'
export { requestIdMiddleware } from './request-id'
