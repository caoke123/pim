/** services/sse-manager.ts — SSE 连接管理器 (基于 Web Streams) */

interface SSEClient {
  id: string
  taskId: string
  writer: WritableStreamDefaultWriter<Uint8Array>
}

const clients = new Map<string, Set<SSEClient>>()
const encoder = new TextEncoder()

function formatSSE(event: string, data: string): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${data}\n\n`)
}

export const sseManager = {
  /** 注册 SSE 客户端 */
  add(taskId: string, writer: WritableStreamDefaultWriter<Uint8Array>): void {
    if (!clients.has(taskId)) {
      clients.set(taskId, new Set())
    }
    const client: SSEClient = { id: crypto.randomUUID(), taskId, writer }
    clients.get(taskId)!.add(client)
  },

  /** 移除 SSE 客户端 */
  remove(taskId: string, writer: WritableStreamDefaultWriter<Uint8Array>): void {
    const set = clients.get(taskId)
    if (!set) return
    for (const c of set) {
      if (c.writer === writer) {
        set.delete(c)
        break
      }
    }
    if (set.size === 0) clients.delete(taskId)
  },

  /** 向任务的所有客户端推送 */
  push(taskId: string, event: string, data: unknown): void {
    const set = clients.get(taskId)
    if (!set) return
    const payload = formatSSE(event, JSON.stringify(data))
    for (const client of set) {
      try {
        client.writer.write(payload)
      } catch {
        set.delete(client)
      }
    }
  },

  /** 关闭任务的所有连接 */
  close(taskId: string): void {
    const set = clients.get(taskId)
    if (!set) return
    for (const client of set) {
      try { client.writer.close() } catch { /* ignore */ }
    }
    clients.delete(taskId)
  },

  sendLog(taskId: string, log: { nodeId: string; message: string; timestamp: string }) {
    this.push(taskId, 'log', log)
  },

  sendProgress(taskId: string, progress: number) {
    this.push(taskId, 'progress', { progress })
  },

  sendStatus(taskId: string, status: string, error?: string) {
    this.push(taskId, 'status', { status, error })
    if (status === 'success' || status === 'failed') {
      setTimeout(() => this.close(taskId), 3000)
    }
  },
}
