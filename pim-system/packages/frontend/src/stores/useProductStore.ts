import { create } from 'zustand'
import { products as mockProducts, type Product } from '@/mock'

interface ProductState {
  products: Product[]
  filter: { search: string; status: string; platform: string; category: string; sort: string }
  setFilter: (f: Partial<ProductState['filter']>) => void
}

export const useProductStore = create<ProductState>((set) => ({
  products: mockProducts,
  filter: { search: '', status: '全部', platform: '全部', category: '全部', sort: '最新创建' },
  setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
}))
