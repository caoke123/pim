/** modules/publish/publish.dto.ts */

export interface CreatePublishTaskDTO {
  platform: string
  productIds: string[]
}

export interface AppendLogDTO {
  nodeId: string
  message: string
  progress: number
}

export interface UpdateStatusDTO {
  status: 'success' | 'failed'
  error?: string
}

export interface PublishTaskResponse {
  id: string
  platform: string
  productIds: string[]
  status: string
  progress: number
  logLines: unknown[]
  error: string | null
  operator: string
  createdAt: string
  completedAt: string | null
}
