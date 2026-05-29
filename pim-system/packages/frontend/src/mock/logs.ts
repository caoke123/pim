export interface BusinessLog {
  id: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  spuCode?: string
  platform?: string
  operator: string
  time: string
}

export const logs: BusinessLog[] = [
  { id: 'L-001', level: 'success', message: 'YXGW260528-0001 已发布至 Shopee，平台商品ID: SH-29384756', spuCode: 'YXGW260528-0001', platform: 'Shopee', operator: '张三', time: '2026-05-29 14:32' },
  { id: 'L-002', level: 'info', message: 'YXGW260528-0002 产品标题更新：波西米亚风串珠项链', spuCode: 'YXGW260528-0002', operator: '李四', time: '2026-05-29 14:25' },
  { id: 'L-003', level: 'error', message: 'YXGW260528-0003 发布失败：Shopee API 429 请求频率超限', spuCode: 'YXGW260528-0003', platform: 'Shopee', operator: '系统', time: '2026-05-29 14:20' },
  { id: 'L-004', level: 'warning', message: 'YXGW260528-0007 详情图审核未通过，原因：图片模糊不清晰', spuCode: 'YXGW260528-0007', operator: '审核系统', time: '2026-05-29 13:55' },
  { id: 'L-005', level: 'success', message: '批量上传完成：共导入12件新产品', operator: '张三', time: '2026-05-29 13:40' },
  { id: 'L-006', level: 'info', message: 'YXGW260528-0015 新增 SKU 规格：玫瑰金 17cm', spuCode: 'YXGW260528-0015', operator: '王五', time: '2026-05-29 12:10' },
  { id: 'L-007', level: 'success', message: 'YXGW260528-0008 已发布至 TikTok，平台商品ID: TK-192838', spuCode: 'YXGW260528-0008', platform: 'TikTok', operator: '系统', time: '2026-05-29 11:55' },
  { id: 'L-008', level: 'error', message: 'YXGW260528-0021 主图上传失败：文件大小超过限制 5MB', spuCode: 'YXGW260528-0021', operator: '李四', time: '2026-05-29 11:30' },
  { id: 'L-009', level: 'info', message: '平台同步任务启动：Shopee → 本地数据库', platform: 'Shopee', operator: '系统', time: '2026-05-29 10:00' },
  { id: 'L-010', level: 'success', message: 'YXGW260528-0005 已发布至 Lazada，平台商品ID: LZ-58291', spuCode: 'YXGW260528-0005', platform: 'Lazada', operator: '系统', time: '2026-05-29 09:45' },
  { id: 'L-011', level: 'info', message: '素材中心批量标记完成：8张图片标记为"已审核"', operator: '张三', time: '2026-05-29 09:20' },
  { id: 'L-012', level: 'warning', message: 'TikTok 平台连接超时，自动重试中...', platform: 'TikTok', operator: '系统', time: '2026-05-29 08:50' },
]
