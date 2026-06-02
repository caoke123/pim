/** components/DistributionDrawer.tsx — 分销详情 Drawer
 *
 * 四 Tab：产品管理 (定价) / 客户信息 / 管理图册 / 合作约定 (Tiptap 富文本)
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  X, Save, Copy, Search,
  Bold, Italic, List, ListOrdered, Heading2, Minus, Loader2, Check, ChevronRight, ChevronDown,
  Package as PackageIcon, Zap, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import type { DistributionDetail, DistributionSkuItem, CustomerListItem, CatalogListItem } from '@/api/types'

const spring = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 }
const TABS = [
  { key: 'catalog', label: '图册绑定' },
  { key: 'products', label: '产品管理' },
  { key: 'customer', label: '客户信息' },
  { key: 'agreement', label: '合作约定' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function DistributionDrawer({ distributionId, defaultTab, onClose }: {
  distributionId: string
  defaultTab?: TabKey
  onClose: () => void
}) {
  const [detail, setDetail] = useState<DistributionDetail | null>(null)
  const [tab, setTab] = useState<TabKey>(defaultTab ?? 'catalog')
  const [savingAgreement, setSavingAgreement] = useState(false)

  async function load() {
    try {
      const res = await api.getDistributionDetail(distributionId)
      setDetail(res.data)
    } catch (e) {
      toast.error('加载分销详情失败')
    }
  }

  useEffect(() => { load() }, [distributionId])

  if (!detail) {
    return (
      <DrawerShell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </DrawerShell>
    )
  }

  return (
    <DrawerShell onClose={onClose}>
      <div className="flex flex-col h-full">
        <div className="px-7 pt-6 pb-4 flex-none" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-[18px] font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
              {detail.customerName} · {detail.catalogName}
            </h2>
            <CopyLinkButton url={detail.publicUrl} />
            <button
              onClick={async () => {
                if (!detail.publicUrl) {
                  toast.error('请先生成链接')
                  return
                }
                await navigator.clipboard.writeText(detail.publicUrl)
                toast.success('链接已复制')
              }}
              className="h-9 px-3 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}>
              <Copy className="w-3.5 h-3.5" />复制链接
            </button>
          </div>
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3 h-8 text-[12px] font-medium rounded-full transition-colors"
                style={{
                  backgroundColor: tab === t.key ? 'var(--accent-soft)' : 'transparent',
                  color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'products' && <ProductsTab detail={detail} onUpdate={load} />}
          {tab === 'customer' && <CustomerTab detail={detail} />}
          {tab === 'catalog' && <CatalogTab detail={detail} onUpdate={load} />}
          {tab === 'agreement' && (
            <AgreementTab
              initial={detail.agreement ?? ''}
              onSave={async html => {
                setSavingAgreement(true)
                try {
                  await api.updateDistribution(detail.id, { agreement: html })
                  toast.success('已保存')
                  await load()
                } catch (e) {
                  toast.error('保存失败')
                } finally {
                  setSavingAgreement(false)
                }
              }}
              saving={savingAgreement}
            />
          )}
        </div>
      </div>
    </DrawerShell>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Drawer Shell
// ═══════════════════════════════════════════════════════════════════

export function DrawerShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'var(--overlay)' }}
        onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: '52%',
          minWidth: '760px',
          maxWidth: '1200px',
          backgroundColor: 'var(--glass)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
          <X className="w-4 h-4" />
        </button>
        {children}
      </motion.div>
    </>
  )
}

function CopyLinkButton({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url)
        toast.success('链接已复制')
      }}
      className="h-9 px-3 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
      style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
      <Copy className="w-3.5 h-3.5" />复制
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Products Tab — 定价 (Accordion + per-product batch + save button)
// ═══════════════════════════════════════════════════════════════════

interface ProductGroup {
  productId: string
  productTitle: string
  productImage: string | null
  spuCode: string
  skus: DistributionSkuItem[]
}

function groupByProduct(skus: DistributionSkuItem[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>()
  for (const s of skus) {
    const key = s.productId || s.spuCode
    if (!map.has(key)) {
      map.set(key, {
        productId: s.productId,
        productTitle: s.productTitle,
        productImage: s.productImage,
        spuCode: s.spuCode,
        skus: [],
      })
    }
    map.get(key)!.skus.push(s)
  }
  return Array.from(map.values())
}

function ProductsTab({ detail, onUpdate }: { detail: DistributionDetail; onUpdate: () => void }) {
  const [skus, setSkus] = useState<DistributionSkuItem[]>(detail.skus)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dirtySkuIds, setDirtySkuIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [batchProductKey, setBatchProductKey] = useState<string | null>(null)
  const [batchPrice, setBatchPrice] = useState('')

  useEffect(() => {
    setSkus(detail.skus)
    setDirtySkuIds(new Set())
    setBatchProductKey(null)
  }, [detail.id, detail.skus])

  const groups = useMemo(() => groupByProduct(skus), [skus])
  const totalSkus = skus.length

  function markDirty(skuId: string) {
    setDirtySkuIds(prev => { const n = new Set(prev); n.add(skuId); return n })
  }

  function setPrice(skuId: string, value: number | null) {
    setSkus(prev => prev.map(s => s.skuId === skuId ? { ...s, customerPrice: value } : s))
    markDirty(skuId)
  }

  function applyBatchToProduct(productKey: string) {
    const group = groups.find(g => (g.productId || g.spuCode) === productKey)
    if (!group) return
    const n = Number(batchPrice.trim())
    if (batchPrice.trim() === '' || !Number.isFinite(n) || n < 0) {
      toast.error('请输入合法价格')
      return
    }
    setSkus(prev => prev.map(s => {
      if (group.skus.some(gs => gs.skuId === s.skuId)) return { ...s, customerPrice: n }
      return s
    }))
    const d = new Set(dirtySkuIds)
    group.skus.forEach(s => d.add(s.skuId))
    setDirtySkuIds(d)
    setBatchProductKey(null)
    setBatchPrice('')
  }

  async function saveModified() {
    if (dirtySkuIds.size === 0) { toast.error('没有需要保存的修改'); return }
    const modified = skus.filter(s => dirtySkuIds.has(s.skuId))
    setSaving(true)
    try {
      const items = modified.map(s => ({ skuId: s.skuId, customerPrice: s.customerPrice }))
      await api.upsertDistributionPrices(detail.id, items)
      setDirtySkuIds(new Set())
      toast.success(`已保存 ${items.length} 个 SKU`)
      onUpdate()
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-7 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>产品管理</h3>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            共 {groups.length} 个产品 / {totalSkus} 个 SKU
          </p>
        </div>
        {dirtySkuIds.size > 0 && (
          <button
            onClick={saveModified}
            disabled={saving}
            className="h-9 px-4 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存修改 ({dirtySkuIds.size})
          </button>
        )}
      </div>

      <div>
        {groups.length === 0 ? (
          <div className="px-4 py-12 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>暂无产品</div>
        ) : (
          <div className="space-y-2">
            {groups.map((g, idx) => {
              const groupKey = g.productId || g.spuCode
              const expanded = expandedId === groupKey
              const pricedCount = g.skus.filter(s => s.customerPrice != null).length
              return (
                <div key={groupKey}
                  className="transition-all duration-200"
                  style={{
                    borderRadius: 16,
                    border: expanded ? '1px solid #c4b5fd' : '1px solid transparent',
                    boxShadow: expanded ? '0 4px 16px rgba(124,58,237,.08)' : 'none',
                    overflow: 'hidden',
                    background: expanded ? '#faf8ff' : '#ffffff',
                  }}>
                  <ProductRow
                    group={g}
                    expanded={expanded}
                    pricedCount={pricedCount}
                    batchOpen={batchProductKey === groupKey}
                    onToggle={() => {
                      if (expanded) { setExpandedId(null); setBatchProductKey(null) }
                      else setExpandedId(groupKey)
                    }}
                    onBatchToggle={() => setBatchProductKey(batchProductKey === groupKey ? null : groupKey)}
                  />
                  {expanded && (
                    <>
                      <div style={{ borderTop: '1px solid #e9d5ff', margin: '0 12px' }} />
                      <div className="px-4 py-2 space-y-1" style={{ paddingBottom: 12 }}>
                        {batchProductKey === groupKey && (
                          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2"
                            style={{ backgroundColor: '#f5f3ff', border: '1px solid #c4b5fd' }}>
                            <Zap className="w-4 h-4 shrink-0" style={{ color: '#7c3aed' }} />
                            <span className="text-[12px] font-medium shrink-0" style={{ color: '#7c3aed' }}>批量定价</span>
                            <span className="text-[11px] shrink-0" style={{ color: '#a78bfa' }}>
                              应用到当前产品 {g.skus.length} 个 SKU
                            </span>
                            <div className="flex-1 max-w-[160px] flex items-center px-2.5 h-8 rounded-lg ml-auto"
                              style={{ backgroundColor: '#fff', border: '1px solid #c4b5fd' }}>
                              <span className="text-[11px] mr-1.5" style={{ color: '#a78bfa' }}>¥</span>
                              <input type="number" min="0" step="0.01" value={batchPrice}
                                onChange={e => setBatchPrice(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyBatchToProduct(groupKey)}
                                placeholder="0.00" autoFocus
                                className="flex-1 bg-transparent outline-none text-[12px] text-right"
                                style={{ color: 'var(--text-primary)' }} />
                            </div>
                            <button onClick={() => applyBatchToProduct(groupKey)}
                              className="h-7 px-3 rounded-full text-[11px] font-medium transition-all active:scale-95"
                              style={{ backgroundColor: '#7c3aed', color: '#fff' }}>应用</button>
                            <button onClick={() => { setBatchProductKey(null); setBatchPrice('') }}
                              className="h-7 px-3 rounded-full text-[11px] font-medium transition-all active:scale-95"
                              style={{ backgroundColor: '#fff', color: '#7c3aed', border: '1px solid #c4b5fd' }}>取消</button>
                          </div>
                        )}
                        {g.skus.map(s => (
                          <SkuRow key={s.skuId} item={s} dirty={dirtySkuIds.has(s.skuId)} onPriceChange={v => setPrice(s.skuId, v)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductRow({ group, expanded, pricedCount, batchOpen, onToggle, onBatchToggle }: {
  group: ProductGroup; expanded: boolean; pricedCount: number; batchOpen: boolean; onToggle: () => void; onBatchToggle: () => void
}) {
  const skuCount = group.skus.length
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200"
      style={{
        backgroundColor: expanded ? 'transparent' : '#ffffff',
        border: 'none',
        borderRadius: 0,
      }}
      onMouseEnter={e => {
        if (!expanded) {
          Object.assign(e.currentTarget.style, {
            backgroundColor: '#f8f7ff',
            boxShadow: '0 4px 16px rgba(124,58,237,.08)',
            transform: 'translateY(-1px)',
            borderRadius: '12px',
          })
        }
      }}
      onMouseLeave={e => {
        if (!expanded) {
          Object.assign(e.currentTarget.style, {
            backgroundColor: '#ffffff',
            boxShadow: 'none',
            transform: 'translateY(0)',
            borderRadius: '0',
          })
        }
      }}>
      <div className="w-11 h-11 rounded-md overflow-hidden shrink-0"
        style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-default)' }}>
        {group.productImage ? (
          <img src={group.productImage} alt={group.productTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
            <PackageIcon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {group.productTitle}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {group.spuCode} · {skuCount} 个 SKU{pricedCount > 0 && pricedCount < skuCount && ` · 已定价 ${pricedCount}/${skuCount}`}
          {pricedCount === skuCount && skuCount > 0 && ' · 已全部定价'}
        </p>
      </div>
      {expanded && (
        <button
          onClick={e => { e.stopPropagation(); onBatchToggle() }}
          className="h-7 px-3 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95 shrink-0"
          style={{
            backgroundColor: batchOpen ? '#7c3aed' : '#f5f3ff',
            color: batchOpen ? '#fff' : '#7c3aed',
            border: '1px solid #c4b5fd',
          }}>
          <Zap className="w-3 h-3" />批量定价
        </button>
      )}
      <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.18 }} className="shrink-0">
        <ChevronRight className="w-4 h-4" style={{ color: expanded ? '#7c3aed' : 'var(--text-tertiary)' }} />
      </motion.div>
    </button>
  )
}

function SkuRow({ item, dirty, onPriceChange }: { item: DistributionSkuItem; dirty: boolean; onPriceChange: (v: number | null) => void }) {
  const [local, setLocal] = useState(item.customerPrice?.toString() ?? '')
  const isDirty = dirty || (item.customerPrice?.toString() ?? '') !== local

  useEffect(() => {
    setLocal(item.customerPrice?.toString() ?? '')
  }, [item.customerPrice])

  function commit() {
    if (!isDirty) return
    if (local === '' || local === '-') onPriceChange(null)
    else {
      const n = Number(local)
      if (Number.isFinite(n) && n >= 0) onPriceChange(n)
      else { setLocal(item.customerPrice?.toString() ?? '') }
    }
  }

  return (
    <div className="grid grid-cols-12 gap-3 items-center py-2.5 px-2 rounded-lg transition-colors"
      style={{
        backgroundColor: isDirty ? '#f5f3ff' : 'var(--bg-elevated)',
        border: isDirty ? '1px solid #c4b5fd' : '1px solid transparent',
      }}
      onMouseEnter={e => { if (!isDirty) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isDirty) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)' }}>
      <div className="col-span-6 flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          {item.productImage ? (
            <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {item.specs || item.skuCode}
          </p>
          <p className="text-[10px] truncate font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {item.skuCode}
          </p>
        </div>
      </div>
      <div className="col-span-2 text-[12px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
        {item.basePrice != null ? `¥${item.basePrice.toFixed(2)}` : '—'}
      </div>
      <div className="col-span-4 flex items-center gap-1.5 justify-end">
        <div className="flex items-center px-2 h-7 rounded-md w-full transition-all"
          style={{
            backgroundColor: isDirty ? '#f5f3ff' : 'var(--bg-surface)',
            border: isDirty ? '1px solid #c4b5fd' : '1px solid var(--border-default)',
          }}>
          <span className="text-[10px] mr-1" style={{ color: 'var(--text-tertiary)' }}>¥</span>
          <input
            type="number" min="0" step="0.01"
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="待定价"
            className="flex-1 w-full bg-transparent outline-none text-[12px] text-right tabular-nums"
            style={{ color: isDirty ? '#7c3aed' : 'var(--text-primary)' }} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Customer Tab — auto-save on blur editable form
// ═══════════════════════════════════════════════════════════════════

type FieldKey = 'name' | 'contactPerson' | 'phone' | 'wechat' | 'notes'
type FieldStatus = 'idle' | 'saving' | 'success'

function CustomerTab({ detail }: { detail: DistributionDetail }) {
  const [name, setName] = useState(detail.customerName)
  const [contactPerson, setContactPerson] = useState(detail.customerContactPerson ?? '')
  const [phone, setPhone] = useState(detail.customerPhone ?? '')
  const [wechat, setWechat] = useState(detail.customerWechat ?? '')
  const [notes, setNotes] = useState(detail.customerNotes ?? '')
  const [status, setStatus] = useState<Record<FieldKey, FieldStatus>>({
    name: 'idle', contactPerson: 'idle', phone: 'idle', wechat: 'idle', notes: 'idle',
  })

  useEffect(() => {
    setName(detail.customerName)
    setContactPerson(detail.customerContactPerson ?? '')
    setPhone(detail.customerPhone ?? '')
    setWechat(detail.customerWechat ?? '')
    setNotes(detail.customerNotes ?? '')
  }, [detail.customerId])

  async function saveField(field: FieldKey, value: string) {
    setStatus(s => ({ ...s, [field]: 'saving' }))
    try {
      // Map local field names to API field names
      const apiField = field === 'name' ? 'name' :
                       field === 'contactPerson' ? 'contactPerson' :
                       field === 'phone' ? 'phone' :
                       field === 'wechat' ? 'wechat' : 'notes'
      await api.updateCustomer(detail.customerId, { [apiField]: value.trim() || undefined } as any)
      setStatus(s => ({ ...s, [field]: 'success' }))
      setTimeout(() => {
        setStatus(s => s[field] === 'success' ? { ...s, [field]: 'idle' } : s)
      }, 2500)
    } catch {
      setStatus(s => ({ ...s, [field]: 'idle' }))
      toast.error('保存失败')
    }
  }

  return (
    <div className="p-7 space-y-2.5 max-w-2xl">
      <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>客户信息</h3>

      <div>
        <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>客户名称</label>
        <div className="relative">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            onBlur={() => { if (name !== detail.customerName) saveField('name', name) }}
            className="w-full h-9 px-3 rounded-xl text-[13px] outline-none transition-colors pr-10"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'} />
          {status.name === 'saving' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
          {status.name === 'success' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#10b981' }} />}
        </div>
      </div>

      <div>
        <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>联系人</label>
        <div className="relative">
          <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)}
            onBlur={() => { if (contactPerson !== (detail.customerContactPerson ?? '')) saveField('contactPerson', contactPerson) }}
            className="w-full h-9 px-3 rounded-xl text-[13px] outline-none transition-colors pr-10"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'} />
          {status.contactPerson === 'saving' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
          {status.contactPerson === 'success' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#10b981' }} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>联系电话</label>
          <div className="relative">
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
              onBlur={() => { if (phone !== (detail.customerPhone ?? '')) saveField('phone', phone) }}
              className="w-full h-9 px-3 rounded-xl text-[13px] outline-none transition-colors pr-10"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'} />
            {status.phone === 'saving' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
            {status.phone === 'success' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#10b981' }} />}
          </div>
        </div>
        <div>
          <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>微信</label>
          <div className="relative">
            <input type="text" value={wechat} onChange={e => setWechat(e.target.value)}
              onBlur={() => { if (wechat !== (detail.customerWechat ?? '')) saveField('wechat', wechat) }}
              className="w-full h-9 px-3 rounded-xl text-[13px] outline-none transition-colors pr-10"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'} />
            {status.wechat === 'saving' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
            {status.wechat === 'success' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#10b981' }} />}
          </div>
        </div>
      </div>

      <div>
        <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>备注</label>
        <div className="relative">
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            onBlur={() => { if (notes !== (detail.customerNotes ?? '')) saveField('notes', notes) }}
            className="w-full px-3 py-2 rounded-xl text-[13px] outline-none resize-none transition-colors pr-10"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'} />
          {status.notes === 'saving' && <Loader2 className="absolute right-3 top-2.5 w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
          {status.notes === 'success' && <Check className="absolute right-3 top-2.5 w-3.5 h-3.5" style={{ color: '#10b981' }} />}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Agreement Tab — Tiptap
// ═══════════════════════════════════════════════════════════════════

function AgreementTab({ initial, onSave, saving }: { initial: string; onSave: (html: string) => Promise<void>; saving: boolean }) {
  const [dirty, setDirty] = useState(false)
  const initialRef = useRef(initial)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: '在此输入合作条款、独家协议、价格保护说明…' })],
    content: initial,
    onUpdate: () => setDirty(true),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] py-4',
      },
    },
  })

  useEffect(() => {
    return () => editor?.destroy()
  }, [editor])

  async function save() {
    if (!editor) return
    await onSave(editor.getHTML())
    setDirty(false)
    setLastSavedAt(new Date())
  }

  if (!editor) return null

  return (
    <div className="p-7 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>合作约定</h3>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {lastSavedAt ? `已保存 · ${lastSavedAt.toLocaleTimeString('zh-CN')}` : '支持加粗、斜体、列表与分隔线'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Toolbar editor={editor} />
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="h-8 px-3 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存
          </button>
        </div>
      </div>

      <div className="flex-1 rounded-2xl px-5 overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null
  const btn = (active: boolean): React.CSSProperties => ({
    width: 30,
    height: 30,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    transition: 'all 0.15s',
  })
  return (
    <div className="flex items-center gap-1 mr-2">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btn(editor.isActive('bold'))}><Bold className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btn(editor.isActive('italic'))}><Italic className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btn(editor.isActive('heading', { level: 2 }))}><Heading2 className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btn(editor.isActive('bulletList'))}><List className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btn(editor.isActive('orderedList'))}><ListOrdered className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} style={btn(false)}><Minus className="w-3.5 h-3.5" /></button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Catalog Tab — 图册绑定 (PhoneCard 风格 + 搜索 + 分页 + 切换绑定)
// ═══════════════════════════════════════════════════════════════════

const CATALOG_PAGE_SIZE = 12

function CatalogTab({ detail, onUpdate }: { detail: DistributionDetail; onUpdate: () => void }) {
  const [catalogs, setCatalogs] = useState<CatalogListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(detail.catalogId)
  const [saving, setSaving] = useState(false)

  async function load(p = page, k = keyword) {
    try {
      const res = await api.getCatalogs({ page: p, pageSize: CATALOG_PAGE_SIZE, keyword: k || undefined } as any)
      setCatalogs(res.data.items)
      setTotal(res.data.total)
      setPage(p)
    } catch {
      toast.error('加载图册列表失败')
    }
  }

  useEffect(() => { load(1, '') }, [])
  useEffect(() => { setSelectedId(detail.catalogId) }, [detail.catalogId])

  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE))

  async function handleBind(catalogId: string | null, catalogName?: string) {
    const prev = selectedId
    setSelectedId(catalogId)
    setSaving(true)
    try {
      await api.updateDistribution(detail.id, { catalogId: catalogId as any } as any)
      if (catalogId && catalogName) {
        toast.success(`已绑定图册：${catalogName}`, { duration: 3000 })
      } else {
        toast.success('已解除绑定', { duration: 2000 })
      }
      onUpdate()
    } catch {
      setSelectedId(prev)
      toast.error('操作失败')
    } finally {
      setSaving(false)
    }
  }

  function handleSelect(cat: CatalogListItem) {
    if (saving) return
    if (selectedId === cat.id) {
      handleBind(null)
    } else {
      handleBind(cat.id, cat.name)
    }
  }

  return (
    <div className="p-7 space-y-5">
      {/* Top status bar */}
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ backgroundColor: '#faf8ff', border: '1px solid #e9d5ff' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#f5f3ff' }}>
          <FileText className="w-5 h-5" style={{ color: '#7c3aed' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px]" style={{ color: '#a78bfa' }}>当前绑定图册</p>
          {detail.catalogId ? (
            <p className="text-[14px] font-semibold truncate" style={{ color: '#7c3aed' }}>
              {detail.catalogName}
            </p>
          ) : (
            <p className="text-[14px]" style={{ color: '#c4b5fd' }}>未绑定图册</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 h-10 rounded-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <Search className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          placeholder="搜索图册名称…"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(1, keyword)}
          className="flex-1 bg-transparent outline-none text-[12px]"
          style={{ color: 'var(--text-primary)' }} />
        <button
          onClick={() => load(1, keyword)}
          className="px-3 h-7 rounded-lg text-[11px] font-medium transition-all active:scale-95"
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
          搜索
        </button>
      </div>

      {/* Phone-card grid */}
      {catalogs.length === 0 ? (
        <div className="text-center text-[12px] py-12" style={{ color: 'var(--text-tertiary)' }}>暂无已发布图册</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, 220px)', justifyContent: 'flex-start' }}>
          {catalogs.map(c => {
            const selected = selectedId === c.id
            const imagesCount = c.productCount * 6
            return (
              <button
                key={c.id}
                type="button"
                disabled={saving}
                onClick={() => handleSelect(c)}
                className="flex flex-col text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                style={{
                  borderRadius: '2.5rem',
                  backgroundColor: '#ffffff',
                  border: selected ? '2px solid #7c3aed' : '2px solid rgba(247,115,20,0.8)',
                  boxShadow: selected
                    ? '0 0 0 4px rgba(124,58,237,.12), 0 8px 30px rgba(124,58,237,.12)'
                    : '0 8px 30px rgba(247,115,20,0.12)',
                  padding: 12,
                }}>
                  <div className="relative w-full overflow-hidden bg-gray-100 shrink-0"
                    style={{ height: 180, borderRadius: '1rem' }}>
                  {c.coverImageUrl ? (
                    <img src={c.coverImageUrl} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
                      <FileText className="w-8 h-8" />
                    </div>
                  )}
                  {selected && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: '#7c3aed', color: '#fff', boxShadow: '0 2px 8px rgba(124,58,237,.3)' }}>
                      ✓ 当前绑定
                    </div>
                  )}
                </div>
                <div className="px-1 pt-3 pb-1 flex-1 flex flex-col">
                  <h3 className="text-[15px] font-semibold text-gray-900 leading-tight truncate">{c.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <span>{imagesCount} 张图片</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                    <span>{c.productCount} 个产品</span>
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => load(Math.max(1, page - 1), keyword)}
            disabled={page <= 1}
            className="px-3 h-8 rounded-lg text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            上一页
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4))
            const p = start + i
            if (p > totalPages) return null
            return (
              <button key={p} onClick={() => load(p, keyword)}
                className="w-8 h-8 rounded-lg text-[11px] font-medium transition-all active:scale-95"
                style={{
                  backgroundColor: p === page ? '#7c3aed' : 'var(--bg-surface)',
                  color: p === page ? '#fff' : 'var(--text-secondary)',
                  border: p === page ? 'none' : '1px solid var(--border-default)',
                }}>{p}</button>
            )
          })}
          <button
            onClick={() => load(page + 1, keyword)}
            disabled={page >= totalPages}
            className="px-3 h-8 rounded-lg text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
