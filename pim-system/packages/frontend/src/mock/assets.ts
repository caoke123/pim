export interface Asset {
  id: string
  url: string
  name: string
  type: '主图' | 'SKU图' | '详情图' | '视频'
  spuCode: string
  spuName: string
  size: string
  dimensions: string
  status: '已审核' | '待审核' | '已驳回'
  uploadedAt: string
}

export const assets: Asset[] = [
  { id: 'A-001', url: 'https://placehold.co/320x240/F6F9FC/8898AA?text=IMG01', name: '手链主图-01.jpg', type: '主图', spuCode: 'YXGW260528-0001', spuName: '复古银色多层手链套装', size: '2.4MB', dimensions: '1200×1200', status: '已审核', uploadedAt: '2026-05-28 09:15' },
  { id: 'A-002', url: 'https://placehold.co/320x240/F6F9FC/8898AA?text=IMG02', name: '手链主图-02.jpg', type: '主图', spuCode: 'YXGW260528-0001', spuName: '复古银色多层手链套装', size: '2.1MB', dimensions: '1200×1200', status: '已审核', uploadedAt: '2026-05-28 09:16' },
  { id: 'A-003', url: 'https://placehold.co/320x240/FFE4E8/C01048?text=REJECT', name: '项链详情-01.jpg', type: '详情图', spuCode: 'YXGW260528-0002', spuName: '波西米亚风串珠项链', size: '812KB', dimensions: '800×600', status: '已驳回', uploadedAt: '2026-05-26 10:05' },
  { id: 'A-004', url: 'https://placehold.co/320x240/F6F9FC/8898AA?text=IMG04', name: '珍珠耳环-主图.jpg', type: '主图', spuCode: 'YXGW260528-0003', spuName: '珍珠水滴耳环', size: '1.5MB', dimensions: '1000×1000', status: '已审核', uploadedAt: '2026-05-25 14:10' },
  { id: 'A-005', url: 'https://placehold.co/320x240/F6F9FC/8898AA?text=IMG05', name: '戒指组合-01.jpg', type: '主图', spuCode: 'YXGW260528-0004', spuName: '简约钛钢戒指组合', size: '3.1MB', dimensions: '1500×1500', status: '待审核', uploadedAt: '2026-05-27 16:35' },
  { id: 'A-006', url: 'https://placehold.co/320x240/F6F9FC/8898AA?text=IMG06', name: '发夹主图.jpg', type: '主图', spuCode: 'YXGW260528-0005', spuName: '蝴蝶结发夹三件套', size: '1.8MB', dimensions: '1200×1200', status: '已审核', uploadedAt: '2026-05-25 11:05' },
  { id: 'A-007', url: 'https://placehold.co/320x240/F6F9FC/8898AA?text=IMG07', name: '项链SKU-金.jpg', type: 'SKU图', spuCode: 'YXGW260528-0006', spuName: '锆石十字架吊坠', size: '980KB', dimensions: '800×800', status: '已审核', uploadedAt: '2026-05-23 08:40' },
  { id: 'A-008', url: 'https://placehold.co/320x240/F6F9FC/8898AA?text=IMG08', name: '耳线-粉色.jpg', type: 'SKU图', spuCode: 'YXGW260528-0008', spuName: '极简几何耳线', size: '1.1MB', dimensions: '900×900', status: '已审核', uploadedAt: '2026-05-22 13:10' },
]

export const assetCategories = ['全部', '主图', 'SKU图', '详情图', '视频']
