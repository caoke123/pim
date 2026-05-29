import { Package } from 'lucide-react'

interface PlatformStatus {
  name: 'Shopee' | 'TikTok' | 'Lazada' | 'Amazon'
  status: 'live' | 'pending' | 'idle' | 'error'
}

interface ProductCardProps {
  imageUrl?: string
  productName: string
  spuCode: string
  skuCount: number
  salePrice: number
  costPrice: number
  platforms: PlatformStatus[]
  onEdit?: () => void
  onPublish?: () => void
  onDetail?: () => void
}

const statusColors: Record<string, { dot: string; bg: string; text: string }> = {
  live:    { dot: 'var(--status-live)',    bg: 'var(--success-bg)', text: 'var(--success)' },
  pending: { dot: 'var(--status-pending)', bg: 'var(--warning-bg)', text: 'var(--warning)' },
  idle:    { dot: 'var(--status-idle)',    bg: 'var(--border-default)', text: 'var(--text-tertiary)' },
  error:   { dot: 'var(--status-error)',   bg: 'var(--danger-bg)',  text: 'var(--danger)' },
}

const statusLabel: Record<string, string> = {
  live: '已发布', pending: '发布中', idle: '未发布', error: '失败'
}

export default function ProductCard({
  imageUrl, productName, spuCode, skuCount, salePrice, costPrice, platforms, onEdit, onPublish, onDetail,
}: ProductCardProps) {
  const profit = salePrice - costPrice
  const profitRate = ((profit / salePrice) * 100).toFixed(0)

  return (
    <div
      className="group rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
    >
      <div className="relative aspect-[16/9] overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={productName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}

        {platforms.length > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
            {platforms.map(p => {
              const c = statusColors[p.status]
              return (
                <span key={p.name} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid var(--border-default)' }}>
                  <span className={p.status === 'pending' ? 'status-dot-live' : ''} style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', backgroundColor: c.dot }} />
                  {p.name}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="p-3.5 space-y-2">
        <h3 className="text-[14px] font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{productName}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{spuCode}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>共 {skuCount} 个 SKU</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            ¥{salePrice.toFixed(2)}
          </span>
          <span className="text-[12px] line-through" style={{ color: 'var(--text-tertiary)' }}>
            成本 ¥{costPrice.toFixed(2)}
          </span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--success)' }}>
            ↑ {profitRate}%
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: '1px solid var(--border-default)' }}>
          {platforms.map(p => {
            const c = statusColors[p.status]
            return (
              <span key={p.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ backgroundColor: c.bg, color: c.text }}>
                <span className={p.status === 'pending' ? 'status-dot-live' : ''} style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', backgroundColor: c.dot }} />
                {p.name} {statusLabel[p.status]}
              </span>
            )
          })}
        </div>

        <div className="flex items-center gap-2 pt-1">
          {onEdit && <ActionBtn onClick={onEdit} label="编辑" />}
          {onPublish && (
            <ActionBtn
              onClick={onPublish}
              label="发布"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
            />
          )}
          {onDetail && <ActionBtn onClick={onDetail} label="详情 →" />}
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ onClick, label, style }: { onClick: () => void; label: string; style?: React.CSSProperties }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors duration-150"
      style={{
        border: '1px solid var(--border-default)',
        color: 'var(--text-secondary)',
        ...style,
      }}
    >
      {label}
    </button>
  )
}
