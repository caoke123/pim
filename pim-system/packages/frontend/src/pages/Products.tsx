/** pages/Products.tsx — 产品库页面 (对接真实 API V3) */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, LayoutGrid, List, AlertTriangle, Loader2 } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import ProductDrawer from '@/components/ProductDrawer'
import PageContainer from '@/components/PageContainer'
import { useProductStore } from '@/stores'
import { api } from '@/api/client'
import { detailToProduct, hasAnyProblem, getProblemLabels } from '@/api/adapter'
import { type Product } from '@/mock'

const viewLSKey = 'pim-products-view'

export default function Products() {
  const { products, loading, error, filter, setFilter, fetchProducts } = useProductStore()
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => (localStorage.getItem(viewLSKey) as 'card' | 'table') || 'table')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, []) // 首次加载

  const switchView = (v: 'card' | 'table') => { setViewMode(v); localStorage.setItem(viewLSKey, v) }

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
          <h1 className="text-[24px] font-medium tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>产品库</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            统一管理 SPU / SKU / 平台发布状态
            {products.length > 0 && <span className="ml-2 text-[11px]" style={{ color: 'var(--accent)' }}>共 {products.length} 个产品</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
          <div className="flex rounded-md" style={{ border: '1px solid var(--border-default)' }}>
            <button onClick={() => switchView('table')} className="w-8 h-8 flex items-center justify-center rounded-l-md transition-colors"
              style={{ backgroundColor: viewMode === 'table' ? 'var(--bg-subtle)' : 'transparent' }}>
              <List className="w-3.5 h-3.5" style={{ color: viewMode === 'table' ? 'var(--accent)' : 'var(--text-tertiary)' }} />
            </button>
            <button onClick={() => switchView('card')} className="w-8 h-8 flex items-center justify-center rounded-r-md transition-colors"
              style={{ backgroundColor: viewMode === 'card' ? 'var(--bg-subtle)' : 'transparent' }}>
              <LayoutGrid className="w-3.5 h-3.5" style={{ color: viewMode === 'card' ? 'var(--accent)' : 'var(--text-tertiary)' }} />
            </button>
          </div>
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

        {/* Table View */}
        {!loading && viewMode === 'table' && (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                  {['', '产品名称', 'SKU数', '价格', '平台状态', '问题标记', ''].map((h, i) => (
                    <th key={i} className={`px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider ${i === 0 ? 'w-[60px]' : i === 2 ? 'w-[80px]' : i === 3 ? 'w-[120px]' : i === 4 ? 'w-[160px]' : i === 5 ? 'w-[140px]' : 'w-[80px]'}`}
                      style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const priceMin = p.skus.length > 0 ? Math.min(...p.skus.map(s => s.price)) : 0
                  const priceMax = p.skus.length > 0 ? Math.max(...p.skus.map(s => s.price)) : 0
                  const showPrice = p.salePrice > 0 || p.costPrice > 0
                  return (
                    <tr key={p.spuCode} className="cursor-pointer transition-colors duration-150"
                      style={{ borderTop: '1px solid var(--border-default)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
                      onClick={() => openDrawer(p)}>
                      <td className="px-3 py-2.5">
                        <div className="w-10 h-10 rounded overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                          {p.mainImage ? (
                            <img src={p.mainImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>无图</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.spuName}</span>
                        <span className="text-[10px] font-mono block mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{p.spuCode}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{p.skuCount}</td>
                      <td className="px-3 py-2.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {showPrice
                          ? `¥${priceMin}${priceMax !== priceMin ? ` ~ ¥${priceMax}` : ''}`
                          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {p.platforms.map(pl => {
                            const c = pl.status === 'live' ? '#34C78A' : pl.status === 'pending' ? '#F59E0B' : pl.status === 'error' ? '#F87171' : '#6B7280'
                            return (
                              <span key={pl.name} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px]"
                                style={{ backgroundColor: `${c}15`, color: c }}>
                                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />{pl.name}
                              </span>
                            )
                          })}
                          {p.platforms.length === 0 && (
                            <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>未配置</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {(() => {
                          // problemFlags 信息已存在 adapter 中但未存到 product
                          // 直接显示 SKU 数据状态
                          const hasPrice = showPrice
                          const hasImage = !!p.mainImage
                          if (!hasImage) {
                            return (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]"
                                style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                                <AlertTriangle className="w-2.5 h-2.5" /> 缺主图
                              </span>
                            )
                          }
                          if (!hasPrice && p.skuCount > 0) {
                            return (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]"
                                style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                                <AlertTriangle className="w-2.5 h-2.5" /> 缺价格
                              </span>
                            )
                          }
                          return null
                        })()}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[12px] font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>详情</span>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center">
                      <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>暂无产品数据</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Card View */}
        {!loading && viewMode === 'card' && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filtered.map(p => (
              <div key={p.spuCode} onClick={() => openDrawer(p)}>
                <ProductCard
                  imageUrl={p.mainImage} productName={p.spuName} spuCode={p.spuCode}
                  skuCount={p.skuCount} salePrice={p.salePrice} costPrice={p.costPrice}
                  platforms={p.platforms}
                  onEdit={() => openDrawer(p)} onPublish={() => {}} onDetail={() => openDrawer(p)}
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
