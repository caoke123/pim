/** stores/useProductStore.ts — 产品状态管理 (对接真实 API) */

import { create } from 'zustand'
import { api } from '@/api/client'
import { listItemToProduct } from '@/api/adapter'
import type { Product } from '@/mock'
import type { ProductListItem } from '@/api/types'

interface ProductState {
  products: Product[]
  total: number
  loading: boolean
  error: string | null
  filter: { search: string; status: string; platform: string; category: string; sort: string }
  setFilter: (f: Partial<ProductState['filter']>) => void
  fetchProducts: () => Promise<void>
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  total: 0,
  loading: false,
  error: null,
  filter: { search: '', status: '全部', platform: '全部', category: '全部', sort: '最新创建' },
  setFilter: (f) => {
    set((s) => ({ filter: { ...s.filter, ...f } }))
    // 筛选条件变更时自动重新获取
    get().fetchProducts()
  },

  fetchProducts: async () => {
    const { filter } = get()
    set({ loading: true, error: null })

    try {
      const params: Record<string, string | number> = {}

      if (filter.search) params.keyword = filter.search
      if (filter.status && filter.status !== '全部') params.status = filter.status
      if (filter.platform && filter.platform !== '全部') params.platform = filter.platform
      if (filter.category && filter.category !== '全部') params.category = filter.category

      const res = await api.getProducts(params)
      const items = res.data.items.map(listItemToProduct)

      set({ products: items, total: res.data.total, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取产品列表失败', loading: false })
    }
  },
}))
