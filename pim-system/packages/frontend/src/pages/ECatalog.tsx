import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Package, Loader2, AlertTriangle, ShoppingBag, Tag, FileText, ChevronRight, X } from 'lucide-react'
import type { ShareDistributionResponse, ShareSkuItem } from '@/api/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL + '/api/share'

export default function ECatalog() {
  const { distributionId } = useParams<{ distributionId: string }>()
  const [data, setData] = useState<ShareDistributionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAgreement, setShowAgreement] = useState(false)

  useEffect(() => {
    if (!distributionId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${API_BASE}/distributions/${distributionId}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error('NOT_FOUND')
        if (!res.ok) throw new Error('LOAD_ERROR')
        const json = await res.json()
        if (!cancelled) setData(json.data ?? null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message === 'NOT_FOUND' ? 'NOT_FOUND' : 'LOAD_ERROR')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [distributionId])

  if (loading) return <LoadingView />
  if (error === 'NOT_FOUND') return <NotFoundView />
  if (error || !data) return <ErrorView onRetry={() => window.location.reload()} />

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-default)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>{data.catalogName}</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {data.customerName ? `${data.customerName}专属目录` : '专属产品目录'} · {data.productCount} 款产品
            </p>
          </div>
          {data.agreement && (
            <button
              onClick={() => setShowAgreement(true)}
              className="flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:opacity-80 px-3 py-1.5 rounded-full"
              style={{ color: 'var(--accent)' }}
            >
              <FileText className="w-3.5 h-3.5" />合作约定
            </button>
          )}
        </div>
      </header>

      {/* Product Grid */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {data.products.length === 0 ? (
          <EmptyProductsView />
        ) : (
          <div className="space-y-8">
            {data.products.map((product) => (
              <ProductSection key={product.productId} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6" style={{ borderColor: 'var(--border-default)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            雨图饰品 · 产品图册
          </p>
        </div>
      </footer>

      {/* Agreement Modal */}
      {showAgreement && data.agreement && (
        <AgreementModal content={data.agreement} onClose={() => setShowAgreement(false)} />
      )}
    </div>
  )
}

function ProductSection({ product }: { product: ShareDistributionResponse['products'][0] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
    >
      {/* Product Header */}
      <div className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6" style={{ borderBottom: product.skus.length ? '1px solid var(--border-default)' : 'none' }}>
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: 'var(--bg-surface)' }}>
          {product.mainImageUrl ? (
            <img src={product.mainImageUrl} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{product.title}</h2>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{product.skus.length} 个规格</p>
        </div>
      </div>

      {/* SKU Table */}
      {product.skus.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th className="text-left font-medium py-2.5 px-4 sm:px-6" style={{ color: 'var(--text-tertiary)' }}>规格</th>
                <th className="text-left font-medium py-2.5 px-2" style={{ color: 'var(--text-tertiary)' }}>编号</th>
                <th className="text-right font-medium py-2.5 px-2" style={{ color: 'var(--text-tertiary)' }}>基准价</th>
                <th className="text-right font-medium py-2.5 px-4 sm:px-6" style={{ color: 'var(--text-tertiary)' }}>客户价</th>
              </tr>
            </thead>
            <tbody>
              {product.skus.map((sku, idx) => (
                <tr
                  key={sku.skuId}
                  className="transition-colors hover:bg-black/5"
                  style={{ borderBottom: idx < product.skus.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                >
                  <td className="py-3 px-4 sm:px-6" style={{ color: 'var(--text-primary)' }}>
                    <span className="inline-flex items-center gap-2">
                      {sku.skuImageUrl && (
                        <img src={sku.skuImageUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" style={{ backgroundColor: 'var(--bg-surface)' }} />
                      )}
                      {sku.specs || sku.skuCode}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{sku.skuCode}</td>
                  <td className="py-3 px-2 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {sku.basePrice != null ? `¥${sku.basePrice.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-right">
                    <PriceCell customerPrice={sku.customerPrice} basePrice={sku.basePrice} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  )
}

function PriceCell({ customerPrice, basePrice }: { customerPrice: number | null; basePrice: number | null }) {
  if (customerPrice != null) {
    const isLower = basePrice != null && customerPrice < basePrice
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-[14px]" style={{ color: isLower ? '#10b981' : 'var(--text-primary)' }}>
        <Tag className="w-3 h-3" />
        ¥{customerPrice.toFixed(2)}
      </span>
    )
  }
  return (
    <span style={{ color: 'var(--text-tertiary)' }}>
      {basePrice != null ? `¥${basePrice.toFixed(2)}` : '—'}
    </span>
  )
}

function LoadingView() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>正在加载产品图册…</p>
    </div>
  )
}

function NotFoundView() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <ShoppingBag className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>图册不存在或已下架</h2>
      <p className="text-[14px] text-center max-w-sm" style={{ color: 'var(--text-tertiary)' }}>该分销链接可能尚未发布，或已被移除</p>
      <Link
        to="/"
        className="mt-2 px-5 py-2.5 rounded-full text-[14px] font-medium transition-all hover:opacity-90"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
      >
        返回首页
      </Link>
    </div>
  )
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
        <AlertTriangle className="w-8 h-8" style={{ color: '#ef4444' }} />
      </div>
      <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>加载失败</h2>
      <p className="text-[14px] text-center max-w-sm" style={{ color: 'var(--text-tertiary)' }}>请检查网络连接后重试</p>
      <button
        onClick={onRetry}
        className="mt-2 px-5 py-2.5 rounded-full text-[14px] font-medium transition-all hover:opacity-90"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
      >
        重新加载
      </button>
    </div>
  )
}

function EmptyProductsView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Package className="w-12 h-12" style={{ color: 'var(--text-tertiary)' }} />
      <p className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>暂无产品</p>
      <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>该图册尚未添加产品</p>
    </div>
  )
}

function AgreementModal({ content, onClose }: { content: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>合作约定</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5">
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </motion.div>
    </div>
  )
}
