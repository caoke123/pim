/** packages/backend/src/services/r2.ts — R2 扫描与读取服务 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  type _Object,
} from '@aws-sdk/client-s3'
import type { ProductJson } from '@yuntu/shared'

export class R2Service {
  private client: S3Client
  private bucket: string

  constructor() {
    const required = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const
    for (const key of required) {
      if (!process.env[key]) {
        console.error(`缺少必填环境变量: ${key}`)
        process.exit(1)
      }
    }

    this.bucket = process.env.R2_BUCKET!
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }

  /** 列举存储桶中所有 product.json 的 Key */
  async listProductJsonKeys(): Promise<string[]> {
    const keys: string[] = []
    let continuationToken: string | undefined

    try {
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: 'products/',
          ContinuationToken: continuationToken,
        })
        const response = await this.client.send(command)

        if (response.Contents) {
          for (const obj of response.Contents) {
            if (obj.Key && obj.Key.endsWith('/product.json')) {
              keys.push(obj.Key)
            }
          }
        }

        continuationToken = response.NextContinuationToken
      } while (continuationToken)

      return keys
    } catch (error) {
      console.error('列举 product.json 失败:', error)
      return []
    }
  }

  /** 读取单个 product.json 并解析为 ProductJson 类型 */
  async getProductJson(key: string): Promise<ProductJson | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
      const response = await this.client.send(command)
      const body = await response.Body?.transformToString()
      if (!body) return null

      const data = JSON.parse(body) as ProductJson

      // product.json 必须包含 r2 字段才会同步（无 r2 字段说明分拣系统尚未完成上传）
      if (!data.r2) {
        console.warn(`跳过无 r2 字段的 product.json: ${key}`)
        return null
      }

      return data
    } catch (error) {
      console.error(`读取 product.json 失败 [${key}]:`, error)
      return null
    }
  }

  /** 批量读取 product.json，concurrency 并发控制，单个失败不影响其他 */
  async batchGetProductJson(
    keys: string[],
    concurrency: number = 5,
  ): Promise<Array<{ key: string; data: ProductJson | null; error?: string }>> {
    const results: Array<{ key: string; data: ProductJson | null; error?: string }> = []

    for (let i = 0; i < keys.length; i += concurrency) {
      const batch = keys.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(async (key) => {
          try {
            const data = await this.getProductJson(key)
            return { key, data }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.error(`批量读取失败 [${key}]:`, message)
            return { key, data: null, error: message }
          }
        }),
      )
      results.push(...batchResults)
    }

    return results
  }

  /** 测试 R2 连接：尝试列举1个对象，验证配置是否正确 */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: 'products/',
        MaxKeys: 1,
      })
      await this.client.send(command)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  }

  /** 从 key 中提取 folderName */
  static extractFolderName(key: string): string {
    // key = "products/[YGG00021] 银心格纹心形挂件_素材包/product.json"
    // folderName = "[YGG00021] 银心格纹心形挂件_素材包"
    const parts = key.split('/')
    return parts.length >= 2 ? parts[1] : key
  }
}
