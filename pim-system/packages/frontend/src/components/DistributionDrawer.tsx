/** components/DistributionDrawer.tsx — 分销详情 Drawer
 *
 * 三 Tab：产品管理 (定价) / 客户信息 / 合作约定 (Tiptap 富文本)
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  X, Save, Copy, Send, Phone, MessageCircle, StickyNote,
  Bold, Italic, List, ListOrdered, Heading2, Minus, Loader2, Edit3, Check, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import type { DistributionDetail, DistributionSkuItem, CustomerListItem, CatalogListItem } from '@/api/types'

const spring = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 }
const TABS = [
  { key: 'products', label: '产品管理' },
  { key: 'customer', label: '客户信息' },
  { key: 'agreement', label: '合作约定' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function DistributionDrawer({ distributionId, onClose }: { distributionId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<DistributionDetail | null>(null)
  const [tab, setTab] = useState<TabKey>('products')
  const [savingAgreement, setSavingAgreement] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)

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
          {tab === 'customer' && (
            <CustomerTab
              detail={detail}
              onSave={async payload => {
                setSavingCustomer(true)
                try {
                  await api.updateDistribution(detail.id, payload)
                  toast.success('已保存')
                  await load()
                } catch (e) {
                  toast.error('保存失败')
                } finally {
                  setSavingCustomer(false)
                }
              }}
              saving={savingCustomer}
            />
          )}
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

function DrawerShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
// Products Tab — 定价
// ═══════════════════════════════════════════════════════════════════

function ProductsTab({ detail, onUpdate }: { detail: DistributionDetail; onUpdate: () => void }) {
  const [skus, setSkus] = useState<DistributionSkuItem[]>(detail.skus)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { setSkus(detail.skus); setDirty(false) }, [detail.skus])

  const filtered = useMemo(() => {
    const k = search.toLowerCase().trim()
    if (!k) return skus
    return skus.filter(s =>
      s.spuCode.toLowerCase().includes(k) ||
      s.skuCode.toLowerCase().includes(k) ||
      s.productTitle.toLowerCase().includes(k) ||
      s.specs.toLowerCase().includes(k)
    )
  }, [skus, search])

  function setPrice(skuId: string, value: number | null) {
    setSkus(prev => prev.map(s => s.skuId === skuId ? { ...s, customerPrice: value } : s))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const items = skus.map(s => ({ skuId: s.skuId, customerPrice: s.customerPrice }))
      const res = await api.upsertDistributionPrices(detail.id, items)
      toast.success(`已保存 ${res.data.updated} 个价格`)
      setDirty(false)
      onUpdate()
    } catch (e) {
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
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>共 {skus.length} 个 SKU，可单独调整客户价格</p>
        </div>
        <div className="flex-1 max-w-xs flex items-center gap-2 px-3 h-9 rounded-xl"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索 SPU / SKU / 标题…"
            className="flex-1 bg-transparent outline-none text-[12px]"
            style={{ color: 'var(--text-primary)' }} />
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="h-9 px-4 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          保存
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-medium"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
          <div className="col-span-5">产品 / SKU</div>
          <div className="col-span-2">基础售价</div>
          <div className="col-span-2 text-center">折扣</div>
          <div className="col-span-3 text-right">客户价格</div>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              没有匹配的产品
            </div>
          ) : filtered.map(s => (
            <SkuRow key={s.skuId} item={s} onPriceChange={v => setPrice(s.skuId, v)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SkuRow({ item, onPriceChange }: { item: DistributionSkuItem; onPriceChange: (v: number | null) => void }) {
  const [local, setLocal] = useState(item.customerPrice?.toString() ?? '')
  const dirty = (item.customerPrice?.toString() ?? '') !== local

  useEffect(() => {
    setLocal(item.customerPrice?.toString() ?? '')
  }, [item.customerPrice])

  function commit() {
    if (!dirty) return
    if (local === '' || local === '-') onPriceChange(null)
    else {
      const n = Number(local)
      if (Number.isFinite(n) && n >= 0) onPriceChange(n)
      else { setLocal(item.customerPrice?.toString() ?? '') }
    }
  }

  const discount = (item.basePrice && item.customerPrice && item.basePrice > 0)
    ? Math.round((1 - item.customerPrice / item.basePrice) * 100)
    : null

  return (
    <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[var(--bg-hover)] transition-colors"
      style={{ borderTop: '1px solid var(--border-soft)' }}>
      <div className="col-span-5 flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 rounded-md overflow-hidden shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          {item.productImage ? (
            <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.productTitle}</p>
          <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
            {item.spuCode} · {item.skuCode}{item.specs ? ` · ${item.specs}` : ''}
          </p>
        </div>
      </div>
      <div className="col-span-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
        {item.basePrice != null ? `¥${item.basePrice.toFixed(2)}` : '—'}
      </div>
      <div className="col-span-2 text-center">
        {discount != null ? (
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: discount > 0 ? 'var(--success-bg)' : discount < 0 ? 'var(--danger-bg)' : 'var(--bg-surface)',
              color: discount > 0 ? 'var(--success)' : discount < 0 ? 'var(--danger)' : 'var(--text-tertiary)',
            }}>
            {discount > 0 ? `−${discount}%` : discount < 0 ? `+${Math.abs(discount)}%` : '0%'}
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>—</span>
        )}
      </div>
      <div className="col-span-3 flex items-center gap-1.5 justify-end">
        <div className="flex items-center px-2 h-8 rounded-lg"
          style={{
            backgroundColor: dirty ? 'var(--accent-soft)' : 'var(--bg-surface)',
            border: dirty ? '1px solid var(--accent)' : '1px solid var(--border-default)',
            transition: 'all 0.15s',
          }}>
          <span className="text-[11px] mr-1" style={{ color: 'var(--text-tertiary)' }}>¥</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="待定价"
            className="w-20 bg-transparent outline-none text-[12px] text-right"
            style={{ color: 'var(--text-primary)' }} />
        </div>
        {dirty && (
          <button
            onClick={commit}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Customer Tab
// ═══════════════════════════════════════════════════════════════════

function CustomerTab({ detail, onSave, saving }: { detail: DistributionDetail; onSave: (p: { customerId: string }) => Promise<void>; saving: boolean }) {
  const [customerId, setCustomerId] = useState(detail.customerId)
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', contactPerson: '', phone: '', wechat: '', notes: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.getCustomers({ pageSize: 100 }).then(r => setCustomers(r.data.items)).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const k = search.toLowerCase().trim()
    if (!k) return customers
    return customers.filter(c => c.name.toLowerCase().includes(k))
  }, [customers, search])

  return (
    <div className="p-7 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>客户信息</h3>
        {!editing && customerId === detail.customerId ? (
          <button
            onClick={() => setEditing(true)}
            className="h-8 px-3 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            <Edit3 className="w-3.5 h-3.5" />更换客户
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditing(false); setCustomerId(detail.customerId) }} className="h-8 px-3 rounded-full text-[12px]"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>取消</button>
            <button
              onClick={() => onSave({ customerId })}
              disabled={saving || customerId === detail.customerId}
              className="h-8 px-3 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              保存
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <div className="flex items-center gap-2 px-3 h-9 rounded-xl"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索客户…"
              className="flex-1 bg-transparent outline-none text-[12px]"
              style={{ color: 'var(--text-primary)' }} />
          </div>
          <div className="rounded-xl p-1 space-y-1"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setCustomerId(c.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                style={{ backgroundColor: customerId === c.id ? 'var(--accent-soft)' : 'transparent' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                </div>
                {customerId === c.id && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        </>
      ) : (
        <CustomerCard detail={detail} />
      )}

      <div className="pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
        <h4 className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>分销信息</h4>
        <InfoRow label="分销 ID" value={detail.id} mono />
        <InfoRow label="分销链接" value={detail.publicUrl ?? '—'} link={detail.publicUrl ?? undefined} />
        <InfoRow label="创建时间" value={new Date(detail.createdAt).toLocaleString('zh-CN')} />
        <InfoRow label="状态" value={detail.status === 'active' ? '启用' : '停用'} />
      </div>
    </div>
  )
}

function CustomerCard({ detail }: { detail: DistributionDetail }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
          {detail.customerName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{detail.customerName}</h4>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{detail.customerContactPerson ?? '未填写联系人'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        {detail.customerPhone && (
          <a href={`tel:${detail.customerPhone}`} className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            <Phone className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            {detail.customerPhone}
          </a>
        )}
        {detail.customerWechat && (
          <button onClick={async () => { await navigator.clipboard.writeText(detail.customerWechat!); toast.success('微信号已复制') }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            {detail.customerWechat}
          </button>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-[12px]">
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      {link ? (
        <button onClick={async () => { await navigator.clipboard.writeText(link); toast.success('已复制') }}
          className="truncate max-w-[60%] hover:underline"
          style={{ color: 'var(--accent)' }}>{value}</button>
      ) : (
        <span className={mono ? 'font-mono text-[11px]' : ''} style={{ color: 'var(--text-primary)' }}>{value}</span>
      )}
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
