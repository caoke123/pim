import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Package, Clock, ShoppingBag, XCircle, Loader2 } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import PageContainer from '@/components/PageContainer'
import { api } from '@/api/client'
import { listItemToProduct } from '@/api/adapter'
import type { StatsOverview, ProductListItem } from '@/api/types'
import type { Product } from '@/mock'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [recentProducts, setRecentProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, productsRes] = await Promise.all([
          api.getStatsOverview(),
          api.getProducts({ page: 1, pageSize: 5 }),
        ])
        setStats(statsRes.data)
        setRecentProducts(productsRes.data.items.map(listItemToProduct))
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { label: '总产品数', value: stats?.totalProducts ?? 0, trend: '', icon: Package, color: '#635BFF', path: '/products' },
    { label: '待处理', value: stats?.pendingProducts ?? 0, trend: '需处理', icon: Clock, color: '#F59E0B', path: '/products?status=pending' },
    { label: '待发布', value: stats?.readyProducts ?? 0, trend: '已就绪', icon: ShoppingBag, color: '#34C78A', path: '/products?status=ready' },
    { label: '发布失败', value: stats?.failedPublishTasks ?? 0, trend: '待重试', icon: XCircle, color: '#F87171', path: '/publish?status=failed' },
  ]

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Search */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-[640px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <input
              placeholder="搜索产品名称、SPU、SKU…"
              className="w-full h-12 pl-11 pr-4 rounded-lg text-[14px] outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'none' }}
              onKeyDown={e => { if (e.key === 'Enter') navigate(`/products?search=${(e.target as HTMLInputElement).value}`) }}
            />
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map(s => (
              <div key={s.label} className="rounded-lg p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                onClick={() => navigate(s.path)}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <span className="text-[13px] tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
                </div>
                <span className="text-[32px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{s.value}</span>
                <p className="text-[12px] mt-1" style={{ color: s.color }}>{s.trend}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recent Products */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] tracking-wide" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>最近产品</span>
            <button onClick={() => navigate('/products')} className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>查看全部 →</button>
          </div>
          {recentProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {recentProducts.map(p => (
                <ProductCard key={p.spuCode}
                  imageUrl={p.mainImage} productName={p.spuName} spuCode={p.spuCode}
                  skuCount={p.skuCount} salePrice={p.salePrice} costPrice={p.costPrice}
                  platforms={p.platforms}
                  onDetail={() => navigate('/products')} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>暂无产品</div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
