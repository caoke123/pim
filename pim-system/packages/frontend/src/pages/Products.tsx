/** pages/Products.tsx — 产品库页面 (对接真实 API V3) */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, AlertTriangle, Loader2 } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import ProductDrawer from '@/components/ProductDrawer'
import PageContainer from '@/components/PageContainer'
import { useProductStore } from '@/stores'
import { api } from '@/api/client'
import { detailToProduct, hasAnyProblem, getProblemLabels } from '@/api/adapter'
import { type Product } from '@/mock'

export default function Products() {
  const { products, loading, error, filter, setFilter, fetchProducts } = useProductStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (filter.search) {
        const q = filter.search.toLowerCase()
        if (!p.spuName.includes(q) && !p.spuCode.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [products, filter])

  const openDrawer = useCallback(async (p: Product) => {
    setDrawerOpen(true)
    setDrawerLoading(true)
    try {
      const productId = p.id || p.spuCode
      const res = await api.getProductDetail(productId)
      setDrawerProduct(detailToProduct(res.data))
    } catch {
      setDrawerProduct(p) // 降级为列表数据
    } finally {
      setDrawerLoading(false)
    }
  }, [])

  const navigateProduct = useCallback(async (p: Product) => {
    setDrawerLoading(true)
    try {
      const productId = p.id || p.spuCode
      const res = await api.getProductDetail(productId)
      setDrawerProduct(detailToProduct(res.data))
    } catch {
      // keep current
    } finally {
      setDrawerLoading(false)
    }
  }, [])

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-gray-900">产品库</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            统一管理 SPU / SKU / 平台发布状态
            {products.length > 0 && <span className="ml-2 text-[13px]" style={{ color: 'var(--accent)' }}>共 {products.length} 个产品</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          <AlertTriangle className="w-4 h-4" />
          <span className="text-[13px]">{error}</span>
          <button onClick={fetchProducts} className="ml-auto text-[12px] underline">重试</button>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
        <input
          value={filter.search} onChange={e => setFilter({ search: e.target.value })}
          placeholder="搜索产品名称、SPU、SKU 编码…"
          className="w-full h-10 pl-10 pr-4 rounded-lg text-[13px] outline-none transition-all duration-200"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {/* Main content */}
      <div
        className="transition-all origin-top"
        style={{
          transition: 'all 420ms cubic-bezier(0.16, 1, 0.3, 1)',
          transform: drawerOpen ? 'scale(0.985)' : 'scale(1)',
          filter: drawerOpen ? 'blur(1px)' : 'blur(0px)',
        }}
      >
        {/* Loading skeleton */}
        {loading && products.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[13px] ml-3" style={{ color: 'var(--text-tertiary)' }}>加载产品列表...</span>
          </div>
        )}

        {/* Card View */}
        {!loading && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filtered.map(p => (
              <div key={p.spuCode} onClick={() => openDrawer(p)}>
                <ProductCard
                  imageUrl={p.mainImage} productName={p.spuName} spuCode={p.spuCode}
                  skuCount={p.skuCount} salePrice={p.salePrice}
                  onDetail={() => openDrawer(p)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <ProductDrawer
        open={drawerOpen}
        product={drawerProduct}
        products={products}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigateProduct}
        onRefresh={async () => {
          if (!drawerProduct?.id) return
          const res = await api.getProductDetail(drawerProduct.id)
          setDrawerProduct(detailToProduct(res.data))
        }}
      />
    </PageContainer>
  )
}
