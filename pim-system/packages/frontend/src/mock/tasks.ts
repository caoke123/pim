export interface PublishTask {
  id: string
  spuCode: string
  spuName: string
  mainImage: string
  platform: string
  status: 'pending' | 'running' | 'success' | 'failed'
  machineName: string
  startedAt: string
  duration: string
  errorInfo?: string
  screenshotUrl?: string
  logs: { time: string; message: string }[]
}

export const tasks: PublishTask[] = [
  { id: 'T-001', spuCode: 'YXGW260528-0002', spuName: '波西米亚风串珠项链', mainImage: 'https://placehold.co/80x80/F6F9FC/8898AA?text=02', platform: 'TikTok', status: 'success', machineName: 'DESKTOP-RPA01', startedAt: '2026-05-29 14:32', duration: '2.4s', logs: [{ time: '14:32:01', message: '任务开始' }, { time: '14:32:03', message: '发布成功' }] },
  { id: 'T-002', spuCode: 'YXGW260528-0003', spuName: '珍珠水滴耳环', mainImage: 'https://placehold.co/80x80/F6F9FC/8898AA?text=03', platform: 'Shopee', status: 'running', machineName: 'DESKTOP-RPA01', startedAt: '2026-05-29 14:30', duration: '进行中', logs: [{ time: '14:30:00', message: '任务开始' }, { time: '14:30:15', message: '正在上传图片...' }] },
  { id: 'T-003', spuCode: 'YXGW260528-0004', spuName: '简约钛钢戒指组合', mainImage: 'https://placehold.co/80x80/F6F9FC/8898AA?text=04', platform: 'Shopee', status: 'pending', machineName: '-', startedAt: '排队中', duration: '-', logs: [] },
  { id: 'T-004', spuCode: 'YXGW260528-0005', spuName: '蝴蝶结发夹三件套', mainImage: 'https://placehold.co/80x80/F6F9FC/8898AA?text=05', platform: 'TikTok', status: 'running', machineName: 'DESKTOP-RPA02', startedAt: '2026-05-29 14:28', duration: '进行中', logs: [{ time: '14:28:00', message: '任务开始' }, { time: '14:28:10', message: '连接 Shopee...' }, { time: '14:28:30', message: '填写产品信息...' }] },
  { id: 'T-005', spuCode: 'YXGW260528-0001', spuName: '复古银色多层手链套装', mainImage: 'https://placehold.co/80x80/F6F9FC/8898AA?text=01', platform: 'Lazada', status: 'success', machineName: 'DESKTOP-RPA01', startedAt: '2026-05-29 14:25', duration: '1.8s', logs: [{ time: '14:25:00', message: '任务开始' }, { time: '14:25:01', message: '发布成功' }] },
  { id: 'T-006', spuCode: 'YXGW260528-0008', spuName: '极简几何耳线', mainImage: 'https://placehold.co/80x80/F6F9FC/8898AA?text=08', platform: 'Shopee', status: 'failed', machineName: 'DESKTOP-RPA01', startedAt: '2026-05-29 14:20', duration: '45s', errorInfo: 'Shopee API 429: Rate limit exceeded. Image upload failed at step 7. Retry after 60s.', screenshotUrl: 'https://placehold.co/400x300/0D0F14/F87171?text=Error+Screenshot', logs: [{ time: '14:20:00', message: '任务开始' }, { time: '14:20:30', message: '上传图片中...' }, { time: '14:20:45', message: 'Shopee返回429错误' }] },
]

export const taskStats = { pending: 1, running: 2, successToday: 8, failedToday: 1 }
