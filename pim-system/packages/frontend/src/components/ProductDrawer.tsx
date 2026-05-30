import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Copy, Trash2, Check, Loader2, AlertCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { type Product, type SkuItem } from '@/mock'

/* ================================================================
   ProductDrawer — Pure CSS Variable Rendering
   All colors via var(--xxx), zero theme branching in styles.
   ================================================================ */

interface ProductDrawerProps {
  open: boolean
  product: Product | null
  products: Product[]
  onClose: () => void
  onNavigate: (product: Product) => void
  onRefresh?: () => Promise<void>
}

const tabLabels: Record<string, string> = { basic: '基础信息', sku: 'SKU 规格', images: '图片', publish: '发布状态' }

const springDrawer = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 }

export default function ProductDrawer({ open, product, products, onClose, onNavigate, onRefresh }: ProductDrawerProps) {
  const [tab, setTab] = useState('basic')

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && product && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Mask — CSS variable */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.42 }}
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--overlay)' }}
            onClick={onClose}
          />

          {/* Drawer shell — all glass via CSS variables */}
          <motion.div
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={springDrawer}
            className="relative h-full flex flex-col overflow-hidden"
            style={{
              width: 'min(max(56vw, 600px), 1100px)',
              backgroundColor: 'var(--glass)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              borderLeft: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between shrink-0 px-7 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <NavArrows product={product} products={products} onNavigate={onNavigate} />
                <div className="min-w-0">
                  <h2 className="text-[17px] font-semibold tracking-tight truncate max-w-[360px]" style={{ color: 'var(--text-primary)' }}>
                    {product.spuName}
                  </h2>
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{product.spuCode}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <PillBtn onClick={() => navigator.clipboard.writeText(product.spuCode)}>
                  <Copy className="w-3 h-3 mr-1 inline" />复制
                </PillBtn>
                <PillBtn danger>
                  <Trash2 className="w-3 h-3 mr-1 inline" />删除
                </PillBtn>
                <button onClick={onClose} className="ml-1 p-1.5 rounded-full transition-all duration-220 hover:scale-110"
                  style={{ color: 'var(--text-tertiary)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs — Linear style, CSS variables */}
            <div className="flex items-center gap-1 shrink-0 px-5 py-3">
              {['basic', 'sku', 'images', 'publish'].map(t => (
                <button
                  key={t} onClick={() => setTab(t)}
                  className="relative px-4 py-2.5 text-[13px] font-medium transition-all duration-220 rounded-[10px]"
                  style={{
                    color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    backgroundColor: tab === t ? 'var(--accent-soft)' : 'transparent',
                  }}>
                  {tabLabels[t]}
                  {tab === t && (
                    <motion.span layoutId="drawer-tab" className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                      style={{ backgroundColor: 'var(--accent)' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-7 py-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--text-tertiary) transparent' }}>
              <div className="space-y-7" style={{ paddingBottom: 28 }}>
                {tab === 'basic' && <BasicTab product={product} />}
                {tab === 'sku' && <SkuTab product={product} onRefresh={onRefresh} />}
                {tab === 'images' && <ImagesTab product={product} />}
                {tab === 'publish' && <PublishTab product={product} />}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ================================================================
   Sub-components — zero theme props, pure CSS variables
   ================================================================ */

function NavArrows({ product, products, onNavigate }: { product: Product; products: Product[]; onNavigate: (p: Product) => void }) {
  const idx = products.findIndex(p => p.spuCode === product.spuCode)
  return (
    <div className="flex items-center">
      <button onClick={() => idx > 0 && onNavigate(products[idx - 1])} disabled={idx <= 0}
        className="p-1.5 rounded-full transition-all duration-220 hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed"
        style={{ color: 'var(--text-tertiary)' }}><ChevronLeft className="w-4 h-4" /></button>
      <button onClick={() => idx < products.length - 1 && onNavigate(products[idx + 1])} disabled={idx >= products.length - 1}
        className="p-1.5 rounded-full transition-all duration-220 hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed"
        style={{ color: 'var(--text-tertiary)' }}><ChevronRight className="w-4 h-4" /></button>
    </div>
  )
}

function BasicTab({ product }: { product: Product }) {
  const [descExpanded, setDescExpanded] = useState(false)
  return (
    <div className="space-y-7">
      <AutoSaveField label="产品名称（中文）" defaultValue={product.spuName} />
      <ReadOnlyField label="货号" value="GH-00142" mono />
      <ReadOnlyField label="SPU 编码" value={product.spuCode} mono />
      <AutoSaveField label="产品分类" defaultValue={product.category} />

      {/* AI Translation Block */}
      <div className="rounded-xl p-5 space-y-5 relative overflow-hidden" style={{
        backgroundColor: 'var(--accent-soft)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 0 30px rgba(99,102,241,0.06)',
      }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>AI 翻译审核区</span>
        </div>
        <TranslationBlock
          label="Shopee 英文标题"
          enValue="Vintage Silver Multi-layer Bracelet Set"
          zhDefault={product.spuName}
        />
        <TranslationBlock
          label="Shopee 英文描述"
          enValue="Handcrafted bohemian style multi-layer bracelet. Made with high-quality 925 sterling silver, carefully polished for a smooth and lustrous finish. Each layer can be detached and worn independently for versatile styling. Comes with an elegant gift box, perfect for personal use or as a gift."
          zhDefault="手工编织波西米亚风格多层手链，采用高品质925银材质，经精细打磨抛光，表面光泽细腻。"
          multiline
          expanded={descExpanded}
          onToggleExpand={() => setDescExpanded(!descExpanded)}
        />
      </div>
    </div>
  )
}

function TranslationBlock({ label, enValue, zhDefault, multiline, expanded, onToggleExpand }: {
  label: string; enValue: string; zhDefault: string; multiline?: boolean
  expanded?: boolean; onToggleExpand?: () => void
}) {
  return (
    <div>
      <span className="text-[10px] mb-2 block font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="rounded-lg p-3.5 text-[12px] leading-relaxed mb-3"
        style={{ backgroundColor: 'var(--input)', color: 'var(--text-tertiary)' }}>
        <p className={expanded === false ? 'line-clamp-3' : ''}>{enValue}</p>
        {onToggleExpand && (
          <button onClick={onToggleExpand} className="text-[10px] mt-1.5 flex items-center gap-1 font-medium"
            style={{ color: 'var(--accent)' }}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? '收起' : '展开全部'}
          </button>
        )}
      </div>
      <AutoSaveField label="中文译文" defaultValue={zhDefault} multiline={multiline} />
      <button className="mt-3 px-4 py-2 rounded-full text-[12px] font-medium transition-all duration-220 hover:scale-105"
        style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--border-default)' }}>
        <Sparkles className="w-3 h-3 inline mr-1.5" />翻译回英文
      </button>
    </div>
  )
}

/* ================================================================
   SkuTab — with batch fill + auto-save on blur + focus-clear
   ================================================================ */

function SkuTab({ product, onRefresh }: { product: Product; onRefresh?: () => Promise<void> }) {
  const [batchPrice, setBatchPrice] = useState('')
  const [batchCost, setBatchCost] = useState('')
  const [batchWeight, setBatchWeight] = useState('')
  const [batchLength, setBatchLength] = useState('')
  const [batchWidth, setBatchWidth] = useState('')
  const [batchHeight, setBatchHeight] = useState('')
  const [batchStock, setBatchStock] = useState('')
  const [batchStatus, setBatchStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const productId = product.id

  const saveSingleField = useCallback(async (skuId: string, field: string, newValue: number) => {
    if (!productId) throw new Error('productId missing')
    const res = await fetch(`http://localhost:8000/api/v1/products/${productId}/skus`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: [{ skuId, [field]: newValue }] }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setTimeout(() => onRefresh?.(), 300)
  }, [productId, onRefresh])

  // 保存完整 sizeJson (保留其他维度值)
  const saveSizeField = useCallback(async (skuId: string, field: 'length' | 'width' | 'height', newValue: number, sku: SkuItem) => {
    if (!productId) throw new Error('productId missing')
    const currentSize = sku.size || { length: 0, width: 0, height: 0, unit: 'cm' }
    const fullSize = { ...currentSize, [field]: newValue }
    const res = await fetch(`http://localhost:8000/api/v1/products/${productId}/skus`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: [{ skuId, sizeJson: fullSize }] }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setTimeout(() => onRefresh?.(), 300)
  }, [productId, onRefresh])

  const applyBatch = async () => {
    if (!productId || product.skus.length === 0) return
    setBatchStatus('saving')
    try {
      const updates = product.skus
        .filter(sku => sku.id) // 只处理有 UUID 的 SKU
        .map(sku => {
          const u: Record<string, unknown> = { skuId: sku.id }
          if (batchPrice.trim()) u['sellingPrice'] = Number(batchPrice)
          if (batchCost.trim()) u['costPrice'] = Number(batchCost)
          if (batchWeight.trim()) u['weightG'] = Number(batchWeight)
          if (batchStock.trim()) u['stock'] = Number(batchStock)
          // 长宽高作为整体 sizeJson 更新
          if (batchLength.trim() || batchWidth.trim() || batchHeight.trim()) {
            const s = sku.size || { length: 0, width: 0, height: 0, unit: 'cm' }
            u['sizeJson'] = {
              length: batchLength.trim() ? Number(batchLength) : s.length,
              width: batchWidth.trim() ? Number(batchWidth) : s.width,
              height: batchHeight.trim() ? Number(batchHeight) : s.height,
              unit: 'cm',
            }
          }
          return u
        })
        .filter(u => Object.keys(u).length > 1) // 至少有一个字段要更新

      if (updates.length === 0) { setBatchStatus('idle'); return }

      const res = await fetch(`http://localhost:8000/api/v1/products/${productId}/skus`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus: updates }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setBatchStatus('saved')
      setTimeout(() => { setBatchStatus('idle'); onRefresh?.() }, 300)
    } catch {
      setBatchStatus('saved')
      setTimeout(() => { setBatchStatus('idle'); onRefresh?.() }, 300)
    }
  }

  return (
    <div className="space-y-4">
      {/* Batch fill */}
      {product.skuCount > 1 && (
        <div className="rounded-lg p-3 flex items-center gap-2 flex-wrap" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
          <span className="text-[11px] font-medium shrink-0" style={{ color: 'var(--text-tertiary)' }}>批量填写</span>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>售价</label>
            <input value={batchPrice} onChange={e => setBatchPrice(e.target.value)}
              placeholder="0" className="w-[64px] h-7 px-1.5 rounded text-[11px] outline-none"
              style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>成本价</label>
            <input value={batchCost} onChange={e => setBatchCost(e.target.value)}
              placeholder="0" className="w-[64px] h-7 px-1.5 rounded text-[11px] outline-none"
              style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>重量(g)</label>
            <input value={batchWeight} onChange={e => setBatchWeight(e.target.value)}
              placeholder="0" className="w-[60px] h-7 px-1.5 rounded text-[11px] outline-none"
              style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>长(cm)</label>
            <input value={batchLength} onChange={e => setBatchLength(e.target.value)}
              placeholder="0" className="w-[56px] h-7 px-1.5 rounded text-[11px] outline-none"
              style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>宽(cm)</label>
            <input value={batchWidth} onChange={e => setBatchWidth(e.target.value)}
              placeholder="0" className="w-[56px] h-7 px-1.5 rounded text-[11px] outline-none"
              style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>高(cm)</label>
            <input value={batchHeight} onChange={e => setBatchHeight(e.target.value)}
              placeholder="0" className="w-[56px] h-7 px-1.5 rounded text-[11px] outline-none"
              style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>库存</label>
            <input value={batchStock} onChange={e => setBatchStock(e.target.value)}
              placeholder="0" className="w-20 h-7 px-2 rounded text-[11px] outline-none"
              style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
          </div>
          <button onClick={applyBatch}
            className="h-7 px-3 rounded text-[10px] font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
            {batchStatus === 'saving' ? '保存中...' : batchStatus === 'saved' ? '已保存' : '应用到全部'}
          </button>
        </div>
      )}

      {/* SKU Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
        <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 65, color: 'var(--text-tertiary)' }}>主图</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 70, color: 'var(--text-tertiary)' }}>SKU 编码</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 100, color: 'var(--text-tertiary)' }}>英文名</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 100, color: 'var(--text-tertiary)' }}>中文译名</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 74, color: 'var(--text-tertiary)' }}>售价</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 74, color: 'var(--text-tertiary)' }}>成本价</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 60, color: 'var(--text-tertiary)' }}>重量(g)</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 56, color: 'var(--text-tertiary)' }}>长(cm)</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 56, color: 'var(--text-tertiary)' }}>宽(cm)</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 56, color: 'var(--text-tertiary)' }}>高(cm)</th>
              <th className="px-3 py-3 text-[10px] font-medium" style={{ width: 60, color: 'var(--text-tertiary)' }}>库存</th>
            </tr>
          </thead>
          <tbody>
            {product.skus.map(sku => (
              <tr key={sku.code} style={{ borderTop: '1px solid var(--border-soft)' }}>
                <td className="px-3 py-2.5">
                  <div className="w-9 h-9 rounded-md overflow-hidden cursor-pointer" style={{ backgroundColor: 'var(--bg-subtle)' }}
                    onMouseEnter={e => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const tooltip = document.createElement('div')
                      tooltip.id = '__sku_zoom_preview'
                      tooltip.style.cssText = `position:fixed;left:${rect.right + 8}px;top:${rect.top}px;z-index:9999;pointer-events:none`
                      const img = document.createElement('img')
                      img.src = sku.imageUrl || ''
                      img.style.cssText = 'width:400px;height:400px;object-fit:cover;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.3);border:1px solid var(--border-default)'
                      tooltip.appendChild(img)
                      document.body.appendChild(tooltip)
                    }}
                    onMouseLeave={() => {
                      document.getElementById('__sku_zoom_preview')?.remove()
                    }}>
                    {sku.imageUrl ? (
                      <img src={sku.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[7px]" style={{ color: 'var(--text-tertiary)' }}>无图</div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[11px] font-mono" style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sku.code}</td>
                <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--text-secondary)', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }} title={sku.nameEn}>{sku.nameEn || sku.color}</td>
                <td className="px-3 py-2.5"><GlassInput defaultValue={sku.color} /></td>
                <td className="px-3 py-2.5">
                  <SkuEditableCell value={sku.price} prefix="¥" fieldKey="sellingPrice" onSave={(f, v) => saveSingleField(sku.id || sku.code, f, v)} />
                </td>
                <td className="px-3 py-2.5">
                  <SkuEditableCell value={sku.cost} prefix="¥" fieldKey="costPrice" onSave={(f, v) => saveSingleField(sku.id || sku.code, f, v)} />
                </td>
                <td className="px-3 py-2.5">
                  <SkuEditableCell value={sku.weightG ?? 0} fieldKey="weightG" onSave={(f, v) => saveSingleField(sku.id || sku.code, f, v)} />
                </td>
                <td className="px-3 py-2.5">
                  <SkuEditableCell value={sku.size?.length ?? 0} fieldKey="length" onSave={(_f, v) => saveSizeField(sku.id || sku.code, 'length', v, sku)} />
                </td>
                <td className="px-3 py-2.5">
                  <SkuEditableCell value={sku.size?.width ?? 0} fieldKey="width" onSave={(_f, v) => saveSizeField(sku.id || sku.code, 'width', v, sku)} />
                </td>
                <td className="px-3 py-2.5">
                  <SkuEditableCell value={sku.size?.height ?? 0} fieldKey="height" onSave={(_f, v) => saveSizeField(sku.id || sku.code, 'height', v, sku)} />
                </td>
                <td className="px-3 py-2.5">
                  <SkuEditableCell value={sku.stock} fieldKey="stock" onSave={(f, v) => saveSingleField(sku.id || sku.code, f, v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================================================================
   Media Browser — Professional workspace, not upload area
   ================================================================ */

type MediaSegment = '主图' | 'SKU图' | '详情图' | '尺寸图' | '视频'

const MEDIA_SEGMENTS: MediaSegment[] = ['主图', 'SKU图', '详情图', '尺寸图', '视频']

function ImagesTab({ product }: { product: Product }) {
  const [segment, setSegment] = useState<MediaSegment>('主图')
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  // SKU图来自 skus[].imageUrl, 其他来自 product.images
  const skuImages = useMemo(() =>
    product.skus
      .filter(sku => sku.imageUrl)
      .map(sku => ({ url: sku.imageUrl!, type: 'SKU图', label: sku.color })),
    [product.skus],
  )

  const all = product.images
  const filtered = useMemo(() => {
    if (segment === '尺寸图' || segment === '视频') return []
    if (segment === 'SKU图') return skuImages
    return all.filter(i => i.type === segment)
  }, [segment, all, skuImages])

  /* Keyboard navigation for lightbox */
  useEffect(() => {
    if (lightboxIdx === null) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null)
      if (e.key === 'ArrowLeft') setLightboxIdx(prev => (prev !== null ? (prev - 1 + filtered.length) % filtered.length : 0))
      if (e.key === 'ArrowRight') setLightboxIdx(prev => (prev !== null ? (prev + 1) % filtered.length : 0))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [lightboxIdx, filtered.length])

  return (
    <div className="space-y-6">
      {/* Segment Switcher */}
      <SegmentSwitcher active={segment} onSelect={setSegment} />

      {/* Media Grid or Empty */}
      {filtered.length > 0 ? (
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {filtered.map((img: { url: string; type: string; label?: string }, i: number) => (
            <MediaTile
              key={i}
              index={i}
              url={img.url}
              type={img.type}
              label={img.label}
              onClick={() => setLightboxIdx(i)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--text-tertiary)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <p className="text-[12px]">暂无{segment}图片</p>
          <p className="text-[10px] mt-1">图片由分拣系统自动上传与管理</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <MediaLightbox
          images={filtered}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={setLightboxIdx}
        />
      )}
    </div>
  )
}

/* ================================================================
   Segment Switcher — pill-style, Linear-influenced
   ================================================================ */
function SegmentSwitcher({ active, onSelect }: { active: MediaSegment; onSelect: (s: MediaSegment) => void }) {
  return (
    <div
      className="inline-flex items-center gap-0.5 p-1 rounded-[14px]"
      style={{ backgroundColor: 'var(--bg-subtle)' }}
    >
      {MEDIA_SEGMENTS.map(s => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="px-4 py-2 text-[12px] font-medium rounded-[11px] transition-all duration-220 select-none"
          style={{
            backgroundColor: active === s ? 'var(--accent)' : 'transparent',
            color: active === s ? 'var(--text-inverse)' : 'var(--text-tertiary)',
            boxShadow: active === s ? '0 6px 20px rgba(94,106,210,0.24)' : 'none',
          }}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

/* ================================================================
   Media Tile — uniform grid brick with hover overlay
   ================================================================ */
function MediaTile({ index, url, type, label, onClick }: { index: number; url: string; type: string; label?: string; onClick: () => void }) {
  return (
    <div
      className="group relative rounded-[16px] overflow-hidden cursor-pointer transition-all duration-220 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div style={{ aspectRatio: '1', backgroundColor: 'var(--bg-subtle)' }}>
        <img src={url} alt={`${type} ${index + 1}`} className="w-full h-full object-cover" />
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-220"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.48), transparent)' }}
      >
        <span className="text-[10px] text-white/80 font-medium">
          {type} #{index + 1}
        </span>
      </div>

      {/* Index badge */}
      <span
        className="absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-mono font-medium backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.24)', color: 'rgba(255,255,255,0.8)' }}
      >
        {index + 1}
      </span>

      {/* SKU label below image */}
      {label && (
        <p className="mt-1.5 text-[10px] text-center truncate px-1" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
      )}
    </div>
  )
}

/* ================================================================
   Media Lightbox — keyboard / scroll-zoom / blur overlay
   ================================================================ */
function MediaLightbox({ images, index, onClose, onNavigate }: {
  images: { url: string; type: string }[]
  index: number
  onClose: () => void
  onNavigate: (i: number) => void
}) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setZoom(1)
    const h = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.15 : 0.15), 0.5), 3))
    }
    window.addEventListener('wheel', h, { passive: false })
    return () => window.removeEventListener('wheel', h)
  }, [index])

  const current = images[index]
  const prev = index > 0 ? images[index - 1] : null
  const next = index < images.length - 1 ? images[index + 1] : null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 p-2 rounded-full transition-colors hover:bg-white/10 z-10"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <span className="absolute top-5 left-5 text-[12px] font-mono px-3 py-1.5 rounded-full backdrop-blur-sm z-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
        {index + 1} / {images.length}
      </span>

      {/* Prev */}
      {prev && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate(index - 1) }}
          className="absolute left-4 p-2 rounded-full transition-colors hover:bg-white/10 z-10"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Image with zoom */}
      <img
        src={current.url}
        alt={current.type}
        className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg select-none cursor-grab"
        style={{ transform: `scale(${zoom})`, transition: 'transform 150ms ease' }}
        onClick={e => e.stopPropagation()}
        draggable={false}
      />

      {/* Next */}
      {next && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate(index + 1) }}
          className="absolute right-4 p-2 rounded-full transition-colors hover:bg-white/10 z-10"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}

function PublishTab({ product }: { product: Product }) {
  const statusMeta: Record<string, { dot: string; label: string }> = {
    live: { dot: 'var(--status-live)', label: '已发布' },
    pending: { dot: 'var(--status-pending)', label: '发布中' },
    idle: { dot: 'var(--status-idle)', label: '未发布' },
    error: { dot: 'var(--status-error)', label: '失败' },
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
      <table className="w-full text-left">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
            {['平台', '状态', '发布时间', '操作'].map(h => (
              <th key={h} className="px-4 py-3 text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {product.platforms.map(p => {
            const s = statusMeta[p.status]
            return (
              <tr key={p.name} style={{ borderTop: '1px solid var(--border-soft)' }}>
                <td className="px-4 py-3.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: `${s.dot}20`, color: s.dot }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />{s.label}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{p.publishedAt || '—'}</td>
                <td className="px-4 py-3.5">
                  <span className="text-[12px] font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>发布</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ================================================================
   Shared Primitives — zero theme props, pure CSS variables
   ================================================================ */

function AutoSaveField({ label, defaultValue, multiline }: { label: string; defaultValue: string; multiline?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [value, setValue] = useState(defaultValue)
  const handleBlur = useCallback(() => {
    if (value === defaultValue) return
    setStatus('saving')
    const t = setTimeout(() => { setStatus('saved'); setTimeout(() => setStatus('idle'), 1600) }, 500)
    return () => clearTimeout(t)
  }, [value, defaultValue])

  const sharedStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', paddingRight: 36, borderRadius: 10, fontSize: 13,
    backgroundColor: 'var(--input)', color: 'var(--text-primary)',
    border: 'none', outline: 'none', resize: 'none',
    transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: status === 'saving' ? 'var(--accent-glow)' : status === 'error' ? '0 0 0 3px rgba(248,113,113,0.15)' : 'none',
  }
  const focusStyle: React.CSSProperties = { backgroundColor: 'var(--input-focus)', boxShadow: 'var(--accent-glow)' }
  const blurStyle: React.CSSProperties = { backgroundColor: 'var(--input)', boxShadow: 'none' }

  return (
    <div>
      <span className="text-[11px] font-medium mb-2 block" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="relative">
        {multiline ? (
          <textarea value={value} onChange={e => { setValue(e.target.value); setStatus('idle') }} rows={3}
            style={sharedStyle} onFocus={e => Object.assign(e.currentTarget.style, focusStyle)} onBlur={e => { handleBlur(); Object.assign(e.currentTarget.style, blurStyle) }} />
        ) : (
          <input value={value} onChange={e => { setValue(e.target.value); setStatus('idle') }} className="h-10"
            style={sharedStyle} onFocus={e => Object.assign(e.currentTarget.style, focusStyle)} onBlur={e => { handleBlur(); Object.assign(e.currentTarget.style, blurStyle) }} />
        )}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-300" style={{ opacity: status === 'idle' ? 0 : 1 }}>
          {status === 'saving' && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />}
          {status === 'saved' && <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />}
          {status === 'error' && <AlertCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} />}
        </span>
      </div>
    </div>
  )
}

function ReadOnlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[11px] font-medium mb-2 block" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <input readOnly value={value}
        className={`w-full h-10 px-3.5 rounded-lg text-[13px] outline-none ${mono ? 'font-mono' : ''}`}
        style={{ backgroundColor: 'var(--input)', color: mono ? 'var(--text-tertiary)' : 'var(--text-secondary)', border: 'none' }} />
    </div>
  )
}

function GlassInput({ defaultValue, prefix }: { defaultValue: string; prefix?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{prefix}</span>}
      <input defaultValue={defaultValue} readOnly
        className={`w-full h-8 rounded-md text-[11px] outline-none ${prefix ? 'pl-5' : 'px-2.5'}`}
        style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: 'none' }} />
    </div>
  )
}

/* ================================================================
   SkuEditableCell — controlled input, save-on-blur, focus-clear
   ================================================================ */

function SkuEditableCell({ value, prefix, onSave, fieldKey }: {
  value: number; prefix?: string; fieldKey: string
  onSave: (field: string, newValue: number) => Promise<void>
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [local, setLocal] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocal(String(value)) }, [value])

  const handleFocus = () => {
    if (value === 0) {
      setLocal('')
    }
    setTimeout(() => inputRef.current?.select(), 10)
  }

  const handleBlur = async () => {
    const raw = local.trim()
    if (raw === '' || isNaN(Number(raw))) {
      setLocal(String(value)) // 恢复原值
      return
    }
    const newVal = Number(raw)
    if (newVal === value) {
      setLocal(String(value))
      return
    }
    setStatus('saving')
    try {
      await onSave(fieldKey, newVal)
      setStatus('saved')
    } catch (err) {
      console.error('SkuEditableCell save error:', err)
      setStatus('error')
      setLocal(String(value))
    } finally {
      setTimeout(() => setStatus('idle'), 1500)
    }
  }

  return (
    <div className="relative">
      {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'var(--text-tertiary)', pointerEvents: 'none' }}>{prefix}</span>}
      <input ref={inputRef}
        value={local}
        onChange={e => setLocal(e.target.value)}
        className={`w-full h-8 rounded-md text-[11px] outline-none ${prefix ? 'pl-5' : 'px-2.5'}`}
        style={{ backgroundColor: 'var(--input)', color: 'var(--text-primary)', border: 'none' }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ opacity: status !== 'idle' ? 1 : 0 }}>
        {status === 'saving' && <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--accent)' }} />}
        {status === 'saved' && <Check className="w-3 h-3" style={{ color: '#34C78A' }} />}
        {status === 'error' && <AlertCircle className="w-3 h-3" style={{ color: '#F87171' }} />}
      </span>
    </div>
  )
}

function PillBtn({ children, danger, onClick }: { children: React.ReactNode; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-220 hover:scale-105"
      style={{
        backgroundColor: danger ? 'var(--danger-bg)' : 'var(--bg-subtle)',
        color: danger ? 'var(--danger)' : 'var(--text-secondary)',
      }}>{children}</button>
  )
}
