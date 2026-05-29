import { create } from 'zustand'
import { assets as mockAssets, type Asset } from '@/mock'

interface AssetState {
  assets: Asset[]
  filter: string
  setFilter: (f: string) => void
}

export const useAssetStore = create<AssetState>((set) => ({
  assets: mockAssets,
  filter: '全部',
  setFilter: (f) => set({ filter: f }),
}))
