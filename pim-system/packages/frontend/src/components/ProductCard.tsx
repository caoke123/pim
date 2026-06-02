import { Package } from 'lucide-react'

interface ProductCardProps {
  imageUrl?: string
  productName: string
  spuCode: string
  skuCount: number
  salePrice: number
  onDetail?: () => void
}

export default function ProductCard({
  imageUrl, productName, spuCode, skuCount, salePrice, onDetail,
}: ProductCardProps) {
  const showPrice = salePrice > 0

  // 待完善判断：售价=0、SKU数为0、或无主图
  const needImprove = !showPrice || skuCount === 0 || !imageUrl

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
      <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={productName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}

        {needImprove && (
          <span className="absolute top-2.5 right-2.5 text-[12px] font-medium text-white px-1.5 py-0.5 rounded"
            style={{ backgroundColor: '#F59E0B' }}>
            待完善
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-2" style={{ minHeight: 120 }}>
        <h3 className="text-[15px] font-medium leading-snug line-clamp-2" style={{
          color: 'var(--text-primary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '2lh',
        }}>{productName}</h3>

        <div className="flex items-end justify-between" style={{ flex: 1 }}>
          <div className="flex items-baseline gap-2 flex-wrap">
            {showPrice && (
              <span className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                ¥{salePrice.toFixed(2)}
              </span>
            )}
            <span className="text-[13px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{spuCode}</span>
            <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>共 {skuCount} 个 SKU</span>
          </div>
          <button onClick={e => { e.stopPropagation(); onDetail?.() }}
            className="h-7 px-3 rounded text-[12px] font-medium shrink-0 transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
            详情 →
          </button>
        </div>
      </div>
    </div>
  )
}