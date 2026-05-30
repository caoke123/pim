/** shared/utils/logger.ts — Pino 日志系统 (支持 requestId 全链路追踪) */

import pino, { type Logger } from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

// 创建 pino logger 实例
const baseLogger: Logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})

/** 创建带 requestId 的子 logger */
export function createRequestLogger(requestId: string): Logger {
  return baseLogger.child({ requestId })
}

/** 全局 logger (无 requestId, 用于应用级日志) */
export const logger: Logger = baseLogger
