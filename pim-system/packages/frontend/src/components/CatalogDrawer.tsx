/** components/CatalogDrawer.tsx — 图册详情 Drawer (V2: 3 Tab) */

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Copy, Trash2, Send, Package, X, Link2, Upload, Sparkles,
  GripVertical, Pencil, Check, Search, Loader2, Folder,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import type { ProductListItem } from '@/api/types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/v1'
const spring = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 }
const MAX_DESC = 200

export interface CatalogBrief {
  id: string
  name: string
  coverImageUrl: string | null
  status: 'draft' | 'published' | 'deleted'
  productCount: number
  publicUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CatalogDetail extends CatalogBrief {
  description: string | null
  viewCount: number
  lastViewedAt: string | null
  publishedAt: string | null
  products: {
    id: string; spuCode: string; title: string; category: string | null
    mainImageUrl: string | null; imagesJson: unknown
  }[]
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '-'
  const d = new Date(s)
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ═══════════════════════════════════════════════════════════════════
// Product Picker Dialog (多选产品)
// ═══════════════════════════════════════════════════════════════════

function ProductPickerDialog({ open, excludeIds, onClose, onConfirm }: {
  open: boolean
  excludeIds: string[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const exclude = useRef(new Set(excludeIds))

  useEffect(() => { exclude.current = new Set(excludeIds) }, [excludeIds])
  useEffect(() => { if (open) { setSelected(new Set()); setKeyword('') } }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const t = setTimeout(() => {
      const params: Record<string, string | number> = { page: 1, pageSize: 50 }
      if (keyword.trim()) params.keyword = keyword.trim()
      api.getProducts(params)
        .then(res => setItems(res.data.items))
        .catch(() => toast.error('加载产品失败'))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [open, keyword])

  const visible = items.filter(p => !exclude.current.has(p.id))
  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = async () => {
    if (selected.size === 0) return
    setSubmitting(true)
    onConfirm(Array.from(selected))
    setSubmitting(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <motion.div className="absolute inset-0 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-[640px] max-w-[92vw] h-[600px] max-h-[80vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 h-14 border-b border-gray-100 shrink-0">
              <h3 className="text-[15px] font-semibold text-gray-900">选择产品</h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索产品名称、SPU 编码…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] bg-gray-50 border border-transparent text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-colors" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-gray-400 text-[13px]"><Loader2 className="w-4 h-4 mr-2 animate-spin" />加载中…</div>
              ) : visible.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400 text-[13px]">没有可添加的产品</div>
              ) : visible.map(p => (
                <label key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                  onMouseEnter={e => { if (!selected.has(p.id)) (e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC' }}
                  onMouseLeave={e => { if (!selected.has(p.id)) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)}
                    className="w-4 h-4 rounded text-[#8B5CF6] focus:ring-[#8B5CF6]" style={{ accentColor: '#8B5CF6' }} />
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 shrink-0">
                    {p.mainImageUrl ? <img src={p.mainImageUrl} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-300 m-auto" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{p.spuCode} · {p.skuCount} SKU</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between px-6 h-14 border-t border-gray-100 shrink-0 bg-gray-50/60">
              <span className="text-[12px] text-gray-500">已选 <b className="text-[#8B5CF6]">{selected.size}</b> 个</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-100">取消</button>
                <button onClick={handleConfirm} disabled={selected.size === 0 || submitting}
                  className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #818CF8, #8B5CF6)' }}>加入图册</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Sortable Product Card
// ═══════════════════════════════════════════════════════════════════

function SortableProductCard({ product, onEdit, onDelete }: {
  product: { id: string; spuCode: string; title: string; mainImageUrl: string | null }
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }
  return (
    <div ref={setNodeRef} style={style}
      className="w-[220px] rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative w-[220px] h-[220px] bg-gray-50 overflow-hidden">
        {product.mainImageUrl ? (
          <img src={product.mainImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-gray-200" /></div>
        )}
        <button {...attributes} {...listeners}
          className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm">
          <GripVertical className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/90 backdrop-blur-sm text-gray-700">产品</span>
      </div>
      <div className="px-3 pt-3 pb-2">
        <p className="text-[13px] font-semibold text-gray-900 truncate">{product.title}</p>
        <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{product.spuCode}</p>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <button onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-full bg-gray-100 text-[11px] font-medium text-gray-700 hover:bg-gray-200 active:scale-95 transition-all">
          <Pencil className="w-3 h-3" />编辑
        </button>
        <button onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-full bg-gray-100 text-[11px] font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all">
          <Trash2 className="w-3 h-3" />删除
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Catalog Drawer
// ═══════════════════════════════════════════════════════════════════

export function CatalogDrawer({ open, catalog, onClose, onRefresh, onDeployTriggered }: {
  open: boolean
  catalog: CatalogBrief | null
  onClose: () => void
  onRefresh: () => void
  onDeployTriggered?: (deployId: string) => void
}) {
  const [tab, setTab] = useState<'products' | 'cover' | 'info'>('products')
  const [detail, setDetail] = useState<CatalogDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadDetail = (id: string) => {
    setLoading(true)
    fetch(`${API_BASE}/catalogs/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setDetail(j.data)
          setEditName(j.data.name)
          setEditDesc(j.data.description || '')
        }
      })
      .catch(() => toast.error('获取图册详情失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open && catalog) {
      setTab('products')
      loadDetail(catalog.id)
    }
  }, [open, catalog?.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (open && e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const persistProducts = async (newProducts: CatalogDetail['products']) => {
    if (!detail) return
    const optimistic = { ...detail, products: newProducts }
    setDetail(optimistic)
    try {
      const r = await fetch(`${API_BASE}/catalogs/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: newProducts.map(p => p.id) }),
      })
      const j = await r.json()
      if (!j.success) throw new Error(j.message)
      if (j.data?.deployId) onDeployTriggered?.(j.data.deployId)
    } catch (err) {
      toast.error('排序失败')
      if (detail) loadDetail(detail.id)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !detail) return
    const oldIndex = detail.products.findIndex(p => p.id === active.id)
    const newIndex = detail.products.findIndex(p => p.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    persistProducts(arrayMove(detail.products, oldIndex, newIndex))
  }

  const handleAddProducts = async (ids: string[]) => {
    if (!detail) return
    setPickerOpen(false)
    const newProducts = [
      ...detail.products,
      ...ids.map(id => ({ id, spuCode: '', title: '加载中…', category: null, mainImageUrl: null, imagesJson: null })),
    ]
    await persistProducts(newProducts as any)
    loadDetail(detail.id)
    onRefresh()
    toast.success(`已添加 ${ids.length} 个产品`)
  }

  const handleRemoveProduct = async (id: string) => {
    if (!detail) return
    await persistProducts(detail.products.filter(p => p.id !== id))
    onRefresh()
    toast.success('已从图册移除')
  }

  const handleEditProduct = (id: string) => {
    if (!detail) return
    window.open(`/products?focus=${id}`, '_blank')
  }

  const handleUploadCover = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !detail) return
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      toast.error('仅支持 jpg / png / webp 格式')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB')
      return
    }
    setUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const r = await fetch(`${API_BASE}/catalogs/${detail.id}/cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      })
      const j = await r.json()
      if (!j.success) throw new Error(j.message)
      if (j.data?.deployId) onDeployTriggered?.(j.data.deployId)
      toast.success('封面上传成功')
      loadDetail(detail.id)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '封面上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveInfo = async () => {
    if (!detail) return
    if (!editName.trim()) { toast.error('图册名称不能为空'); return }
    setSaving(true)
    try {
      const r = await fetch(`${API_BASE}/catalogs/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
      })
      const j = await r.json()
      if (!j.success) throw new Error(j.message)
      if (j.data?.deployId) onDeployTriggered?.(j.data.deployId)
      toast.success('保存成功')
      loadDetail(detail.id)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!catalog) return null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.32 }} className="absolute inset-0 bg-black/10" onClick={onClose} />
          <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={spring}
            className="relative h-full flex flex-col overflow-hidden bg-white shadow-2xl"
            style={{ width: 'min(64vw, 1200px)', borderLeft: '1px solid #EEF2F7' }}>
            <div className="flex items-center justify-between px-6 h-16 border-b border-gray-100 shrink-0">
              <h2 className="text-[16px] font-semibold text-gray-900">{catalog.name}</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="flex gap-0 px-6 border-b border-gray-100 shrink-0">
              {([
                { k: 'products', l: '产品管理' },
                { k: 'cover', l: '封面管理' },
                { k: 'info', l: '图册信息' },
              ] as const).map(t => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`px-4 py-3 text-[13px] font-medium transition-colors border-b-2 -mb-[1px] ${tab === t.k ? 'border-[#8B5CF6] text-[#8B5CF6]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {t.l}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40 text-gray-400"><Loader2 className="w-5 h-5 mr-2 animate-spin" />加载中…</div>
              ) : !detail ? (
                <div className="flex items-center justify-center h-40 text-gray-400">暂无数据</div>
              ) : tab === 'products' ? (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[13px] text-gray-500">产品数量：<b className="text-gray-900">{detail.products.length}</b></span>
                    <button onClick={() => setPickerOpen(true)}
                      className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-semibold text-white transition-all hover:brightness-105"
                      style={{ background: 'linear-gradient(135deg, #818CF8, #8B5CF6)' }}>
                      <Plus className="w-3.5 h-3.5" />新增产品
                    </button>
                  </div>
                  {detail.products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                      <Package className="w-10 h-10 mb-2 opacity-30" />
                      <p className="text-[13px]">图册还没有产品，点击右上角添加</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={detail.products.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="flex flex-wrap gap-4">
                          {detail.products.map(p => (
                            <SortableProductCard key={p.id} product={p} onEdit={() => handleEditProduct(p.id)} onDelete={() => handleRemoveProduct(p.id)} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              ) : tab === 'cover' ? (
                <div className="p-6">
                  <p className="text-[13px] font-medium text-gray-700 mb-4">当前图册封面</p>
                  <div className="flex justify-center mb-6">
                    <div className="w-[240px] h-[426px] rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                      {detail.coverImageUrl ? (
                        <img src={detail.coverImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Folder className="w-16 h-16 text-gray-300" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center mb-6">
                    <button onClick={() => toast.info('功能开发中')}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-medium transition-colors"
                      style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#EDE9FE'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#F5F3FF'}>
                      <Sparkles className="w-3.5 h-3.5" />重新生成封面
                    </button>
                    <button onClick={handleUploadCover} disabled={uploading}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-40">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? '上传中…' : '上传封面'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                  </div>
                  <div className="max-w-md mx-auto px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[11px] font-medium text-gray-500 mb-1.5">推荐规格</p>
                    <div className="space-y-0.5 text-[11px] text-gray-400">
                      <p>尺寸：1080 × 1920</p>
                      <p>比例：9 : 16</p>
                      <p>格式：jpg / png / webp</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 pb-24">
                  <div className="max-w-2xl mx-auto space-y-5">
                    <Field label="图册名称">
                      <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={255}
                        className="w-full h-10 px-3 rounded-lg text-[13px] bg-white border border-gray-200 text-gray-900 outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 transition-all" />
                    </Field>

                    <Field label={`图册描述 (${editDesc.length}/${MAX_DESC})`}>
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value.slice(0, MAX_DESC))} rows={4}
                        placeholder="为图册添加一段描述，便于团队理解"
                        className="w-full px-3 py-2 rounded-lg text-[13px] bg-white border border-gray-200 text-gray-900 outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 transition-all resize-none" />
                    </Field>

                    <Field label="状态">
                      <div className="h-10 px-3 flex items-center rounded-lg bg-gray-50 border border-gray-100">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[12px] font-semibold ${detail.status === 'published' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#DBEAFE] text-[#2563EB]'}`}>
                          {detail.status === 'published' ? '已发布' : '未发布'}
                        </span>
                      </div>
                    </Field>

                    <Field label="创建时间">
                      <div className="h-10 px-3 flex items-center rounded-lg bg-gray-50 border border-gray-100 text-[13px] text-gray-700 font-mono">
                        {formatDate(detail.createdAt)}
                      </div>
                    </Field>

                    {detail.status === 'published' && (
                      <>
                        <Field label="访问链接">
                          <div className="flex items-center gap-2">
                            <input readOnly value={`${window.location.protocol}//${window.location.hostname}:3010/c/${detail.id}`}
                              className="flex-1 h-10 px-3 rounded-lg text-[12px] bg-gray-50 border border-gray-200 text-gray-600 outline-none font-mono" />
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.protocol}//${window.location.hostname}:3010/c/${detail.id}`); toast.success('链接已复制') }}
                              className="h-10 px-3 rounded-lg text-[12px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </Field>

                        <Field label="访问次数">
                          <div className="h-10 px-3 flex items-center rounded-lg bg-gray-50 border border-gray-100 text-[13px] text-gray-700 font-mono">
                            {detail.viewCount ?? 0}
                          </div>
                        </Field>

                        <Field label="最后访问时间">
                          <div className="h-10 px-3 flex items-center rounded-lg bg-gray-50 border border-gray-100 text-[13px] text-gray-700 font-mono">
                            {formatDate(detail.lastViewedAt)}
                          </div>
                        </Field>

                        <Field label="发布时间">
                          <div className="h-10 px-3 flex items-center rounded-lg bg-gray-50 border border-gray-100 text-[13px] text-gray-700 font-mono">
                            {formatDate(detail.publishedAt)}
                          </div>
                        </Field>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {tab === 'info' && detail && !loading && (
              <div className="flex items-center justify-between px-6 h-16 border-t border-gray-100 shrink-0 bg-white">
                <button onClick={onClose} className="h-9 px-5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-100 active:scale-95 transition-all">取消</button>
                <button onClick={handleSaveInfo} disabled={saving}
                  className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-40 active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg, #818CF8, #8B5CF6)' }}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {saving ? '保存中…' : '保存修改'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <ProductPickerDialog open={pickerOpen} excludeIds={detail?.products.map(p => p.id) || []} onClose={() => setPickerOpen(false)} onConfirm={handleAddProducts} />
    </AnimatePresence>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500 mb-1.5">{label}</p>
      {children}
    </div>
  )
}
