/** shared/utils/errors.ts — 统一错误类体系 */

// ── 错误码枚举 ──

export const ErrorCode = {
  // 通用
  INTERNAL: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',

  // 业务
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  SKU_NOT_FOUND: 'SKU_NOT_FOUND',
  SKU_NOT_BELONG: 'SKU_NOT_BELONG',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_PLATFORM: 'INVALID_PLATFORM',
  DUPLICATE_SPU_CODE: 'DUPLICATE_SPU_CODE',
  DUPLICATE_SKU_CODE: 'DUPLICATE_SKU_CODE',

  // 系统
  DB_ERROR: 'DB_ERROR',
  R2_ERROR: 'R2_ERROR',
  SYNC_ERROR: 'SYNC_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

// ── 基础错误类 ──

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly status: number
  public readonly details?: unknown

  constructor(code: ErrorCode, message: string, status = 500, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
    Object.setPrototypeOf(this, AppError.prototype)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

// ── 业务错误 (400) ──

export class BusinessError extends AppError {
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(code, message, 400, details)
    this.name = 'BusinessError'
    Object.setPrototypeOf(this, BusinessError.prototype)
  }
}

// ── 参数校验错误 (400) ──

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION, message, 400, details)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

// ── 资源不存在错误 (404) ──

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 404)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

// ── 鉴权错误 (401) ──

export class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super(ErrorCode.UNAUTHORIZED, message, 401)
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

// ── 禁止访问错误 (403) ──

export class ForbiddenError extends AppError {
  constructor(message = '禁止访问') {
    super(ErrorCode.FORBIDDEN, message, 403)
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}
