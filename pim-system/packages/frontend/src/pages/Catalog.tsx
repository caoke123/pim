import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Trash2, FileText, Send, FolderOpen, Eye,
  Folder, Package, Image as ImageIcon, TrendingUp, MoreHorizontal,
  ChevronLeft, ChevronRight, X, Link2,
  Wifi, BatteryMedium, Signal, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useThemeStore } from '@/stores/useThemeStore'
import { CatalogDrawer as CatalogDrawerComponent } from '@/components/CatalogDrawer'

const API_BASE = 'http://localhost:8000/api/v1'
const ECATALOG_BASE = import.meta.env.VITE_ECATALOG_BASE_URL || `${window.location.protocol}//${window.location.hostname}:3010`
const PAGE_SIZE = 12

interface Catalog {
  id: string; name: string; coverImageUrl: string | null; fallbackCoverUrl: string | null
  status: 'draft' | 'published' | 'deleted'; productCount: number; publicUrl: string | null
  createdAt: string; updatedAt: string
}
interface Stats { totalCatalogs: number; totalProducts: number; totalImages: number; publishedCount: number; publishedRatio: number }
interface CatalogProduct { id: string; spuCode: string; title: string; category: string | null; mainImageUrl: string | null; imagesJson: any }

const spring = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 }

// ═══════════════════════════════════════════════════════════════════
// More Menu
// ═══════════════════════════════════════════════════════════════════

function MoreMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"><MoreHorizontal className="w-4 h-4" /></button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,23,42,0.10)] border border-gray-100 py-1 z-20">
            <button onClick={() => { setOpen(false); onDelete() }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors rounded-lg mx-1"><Trash2 className="w-3.5 h-3.5" />删除图册</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Phone Mockup Card
// ═══════════════════════════════════════════════════════════════════

function PhoneCard({ catalog, onView, onPublish, onCopyLink, onDelete, publishing, deploying }: {
  catalog: Catalog; onView: () => void; onPublish: () => void; onCopyLink: () => void; onDelete: () => void; publishing: string | null; deploying: boolean
}) {
  const isPublished = catalog.status === 'published'
  const statusLabel = isPublished ? '已发布' : '未发布'
  const imagesCount = catalog.productCount * 6
  return (
    <div onClick={onView} className="bg-white rounded-[2.5rem] p-3 border-2 border-[#f77314]/80 shadow-[0_8px_30px_rgba(247,115,20,0.12)] flex flex-col hover:shadow-[0_20px_50px_rgba(247,115,20,0.22)] hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      <div className="flex justify-between items-center px-4 pt-1 flex-none z-10 w-full relative h-7">
        <span className="text-[10px] font-medium text-gray-800 absolute left-4">9:41</span>
        <div className="absolute left-1/2 top-1.5 -translate-x-1/2 w-[68px] h-[18px] bg-black rounded-full" />
        <div className="flex items-center gap-[3px] absolute right-4 text-gray-800">
          <Signal className="w-3 h-3 fill-current" />
          <Wifi className="w-3 h-3" />
          <BatteryMedium className="w-[18px] h-[18px]" />
        </div>
      </div>

      <div className="relative rounded-[1.25rem] overflow-hidden aspect-[4/5] w-full mt-2 bg-gray-100 shrink-0">
        {(catalog.coverImageUrl || catalog.fallbackCoverUrl) ? (
          <img src={(catalog.coverImageUrl || catalog.fallbackCoverUrl)!} alt={catalog.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Folder className="w-10 h-10 text-gray-200" />
          </div>
        )}
        <div className={`absolute top-3 right-3 px-2 py-[2px] rounded-full text-[10px] font-medium backdrop-blur-md border ${
          isPublished
            ? 'bg-green-100/90 text-green-700 border-green-200'
            : 'bg-blue-100/90 text-blue-700 border-blue-200'
        }`}>
          {statusLabel}
        </div>
      </div>

      <div className="px-2 pt-4 pb-2 flex-1 flex flex-col">
        <h3 className="text-[15px] font-semibold text-gray-900 leading-tight truncate">{catalog.name}</h3>
        <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
          <span>{imagesCount} 张图片</span>
          <span className="w-0.5 h-0.5 rounded-full bg-gray-300"></span>
          <span>{catalog.productCount} 个产品</span>
        </p>
        <div className="mt-auto pt-4 flex gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={onView} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-gray-100 text-xs text-gray-700 hover:bg-orange-50 hover:text-[#f77314] active:scale-95 transition-all">
            <Eye className="w-3.5 h-3.5" />
            查看
          </button>
          {isPublished ? (
            deploying ? (
              <button disabled className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-orange-50 text-xs text-orange-600 opacity-70">
                <Loader2 className="h-3 w-3 animate-spin" />
                构建中...
              </button>
            ) : (
              <button onClick={onCopyLink} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-gray-100 text-xs text-gray-700 hover:bg-orange-50 hover:text-[#f77314] active:scale-95 transition-all">
                <Link2 className="w-3.5 h-3.5" />
                复制链接
              </button>
            )
          ) : (
            <button onClick={onPublish} disabled={publishing === catalog.id} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-gray-100 text-xs text-gray-700 hover:bg-orange-50 hover:text-[#f77314] active:scale-95 transition-all disabled:opacity-40">
              <Send className="w-3.5 h-3.5" />
              {publishing === catalog.id ? '发布中...' : '发布'}
            </button>
          )}
          <div className="flex items-center justify-center">
            <MoreMenu onDelete={onDelete} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Create Modal
// ═══════════════════════════════════════════════════════════════════

const modalOverride: Record<string, any> = {
  light: {
    overlayBg: 'rgba(255,255,255,0.08)', overlayBlur: 'blur(4px)', modalBg: 'rgba(255,255,255,0.94)', modalBorder: '1px solid rgba(255,255,255,0.7)', modalShadow: '0 24px 64px rgba(15,23,42,0.12)', titleColor: '#111827', descColor: '#6B7280', inputBorder: '1px solid #D1D5DB', inputFocusBorder: '1px solid #8B5CF6', inputFocusShadow: '0 1px 0 #8B5CF6, 0 0 10px rgba(139,92,246,0.12)', inputColor: '#111827', inputPlaceholder: '#9CA3AF', cancelColor: '#6B7280', cancelHoverBg: 'rgba(0,0,0,0.05)', kbdBg: 'rgba(0,0,0,0.08)', kbdColor: 'rgba(0,0,0,0.4)', iconGradient: 'linear-gradient(135deg, #DDD6FE, #A78BFA)', iconGlow: '0 0 24px rgba(139,92,246,0.18)', ambientSize: 180, ambientColor: 'rgba(139,92,246,0.04)',
  },
  dark: {
    overlayBg: 'rgba(0,0,0,0.48)', overlayBlur: 'blur(8px)', modalBg: 'rgba(18,18,20,0.82)', modalBorder: '1px solid rgba(255,255,255,0.08)', modalShadow: '0 40px 120px rgba(0,0,0,0.45)', titleColor: '#FFFFFF', descColor: 'rgba(255,255,255,0.55)', inputBorder: '1px solid rgba(255,255,255,0.12)', inputFocusBorder: '1px solid #8B5CF6', inputFocusShadow: '0 0 10px rgba(139,92,246,0.15)', inputColor: '#F0F0F5', inputPlaceholder: 'rgba(255,255,255,0.35)', cancelColor: 'rgba(255,255,255,0.55)', cancelHoverBg: 'rgba(255,255,255,0.06)', kbdBg: 'rgba(255,255,255,0.08)', kbdColor: 'rgba(255,255,255,0.35)', iconGradient: 'linear-gradient(135deg, #C4B5FD, #8B5CF6)', iconGlow: '0 0 40px rgba(139,92,246,0.35)', ambientSize: 180, ambientColor: 'rgba(139,92,246,0.08)',
  },
}

function CreateModal({ open, onClose, name, onChangeName, creating, onCreate }: {
  open: boolean; onClose: () => void; name: string; onChangeName: (v: string) => void; creating: boolean; onCreate: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const theme = useThemeStore(s => s.theme)
  const t = modalOverride[theme]
  useEffect(() => { if (open) { const timer = setTimeout(() => inputRef.current?.focus(), 150); return () => clearTimeout(timer) } }, [open])
  useEffect(() => { function onK(e: KeyboardEvent) { if (open && e.key === 'Escape') onClose() }; window.addEventListener('keydown', onK); return () => window.removeEventListener('keydown', onK) }, [open, onClose])
  return (<AnimatePresence>{open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div className="absolute inset-0" style={{ background: t.overlayBg, backdropFilter: t.overlayBlur, WebkitBackdropFilter: t.overlayBlur }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: -8 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }} className="relative w-[560px] max-w-[90vw] rounded-3xl" style={{ boxShadow: t.modalShadow, border: t.modalBorder }}>
        <div className="absolute inset-0 rounded-3xl" style={{ background: t.modalBg, backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', zIndex: 0 }} />
        <div className="relative px-10 pt-10 pb-8" style={{ zIndex: 1 }}>
          <div className="absolute top-5 left-1/2 pointer-events-none" style={{ width: `${t.ambientSize}px`, height: `${t.ambientSize}px`, transform: 'translateX(-50%)', background: `radial-gradient(circle, ${t.ambientColor}, transparent 70%)`, filter: 'blur(50px)', zIndex: 0 }} />
          <div className="relative flex justify-center mb-6" style={{ zIndex: 1 }}><div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: t.iconGradient, boxShadow: t.iconGlow }}><FolderOpen className="w-8 h-8 text-white" strokeWidth={1.5} /></div></div>
          <h2 className="text-center text-[28px] font-bold tracking-tight mb-2" style={{ color: t.titleColor }}>新建图册</h2>
          <p className="text-center text-[14px] mb-8" style={{ color: t.descColor }}>给这个图册起个名字，便于后续查找和管理</p>
          <style>{`.cci::placeholder{color:${t.inputPlaceholder}}`}</style>
          <div className="mb-8"><input ref={inputRef} type="text" value={name} onChange={e => onChangeName(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (name.trim() && !creating) onCreate() } }} placeholder="春季新品图册" className="cci w-full h-14 bg-transparent border-0 text-center text-[22px] font-medium outline-none transition-all duration-200" style={{ borderBottom: focused ? t.inputFocusBorder : t.inputBorder, boxShadow: focused ? t.inputFocusShadow : 'none', color: t.inputColor }} autoComplete="off" spellCheck={false} /></div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} className="h-11 px-5 rounded-xl text-[13px] font-medium transition-colors" style={{ color: t.cancelColor }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = t.cancelHoverBg }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}><span className="inline-flex items-center gap-1.5"><kbd className="inline-flex items-center justify-center w-5 h-5 rounded-[5px] text-[10px] font-medium" style={{ backgroundColor: t.kbdBg, color: t.kbdColor, fontFamily: 'inherit' }}>Esc</kbd>取消</span></button>
            <button onClick={onCreate} disabled={creating || !name.trim()} className="h-11 px-6 rounded-xl text-[13px] font-semibold transition-all duration-200 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #818CF8, #8B5CF6)', color: '#FFFFFF' }} onMouseEnter={e => { if (!creating && name.trim()) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)' }}><span className="inline-flex items-center gap-1.5">{creating ? '创建中...' : '创建'}{!creating && <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded-[5px] text-[10px] font-medium bg-white/20 text-white/80" style={{ fontFamily: 'inherit' }}>↵</kbd>}</span></button>
          </div>
        </div>
      </motion.div>
    </div>
  )}</AnimatePresence>)
}

// ═══════════════════════════════════════════════════════════════════
// Catalog Page V3
// ═══════════════════════════════════════════════════════════════════

export default function CatalogPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [stats, setStats] = useState<Stats>({ totalCatalogs: 0, totalProducts: 0, totalImages: 0, publishedCount: 0, publishedRatio: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Catalog | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [drawerCatalog, setDrawerCatalog] = useState<Catalog | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [deployingIds, setDeployingIds] = useState<Set<string>>(new Set())
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchStats = () => {
    fetch(`${API_BASE}/catalogs/stats`).then(r => r.json()).then(j => j.success && setStats(j.data)).catch(() => {})
  }

  const fetchData = () => {
    setLoading(true)
    fetch(`${API_BASE}/catalogs?page=${page}&pageSize=${PAGE_SIZE}`)
      .then(r => r.json()).then(j => { setCatalogs(j.data?.items ?? []); setTotal(j.data?.total ?? 0) })
      .catch(() => toast.error('获取图册列表失败')).finally(() => setLoading(false))
    fetchStats()
  }

  useEffect(() => { fetchData() }, [page])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const r = await fetch(`${API_BASE}/catalogs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), productIds: [] }) })
      const j = await r.json()
      if (j.success) { toast.success('图册创建成功'); setCreateOpen(false); setNewName(''); setPage(1); fetchData() } else toast.error(j.message ?? '创建失败')
    } catch { toast.error('创建失败') } finally { setCreating(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const r = await fetch(`${API_BASE}/catalogs/${deleteTarget.id}`, { method: 'DELETE' })
      if ((await r.json()).success) { toast.success('已删除'); setDeleteTarget(null); setConfirmOpen(false); setPage(1); fetchData() }
    } catch { toast.error('删除失败') }
  }

  /** 轮询 Cloudflare Pages 部署状态, 完成后移除构建中间态 */
  const pollDeployStatus = async (catalogId: string, deployId: string) => {
    const maxAttempts = 30 // 最多等待 2.5 分钟
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000)) // 每5秒轮询一次
      try {
        const res = await fetch(`${API_BASE}/deploy/status/${deployId}`)
        const json = await res.json()
        if (json.code === 0 && json.data?.status === 'success') {
          toast.success(`构建完成, 图册已生效`)
          break
        }
        if (json.data?.status === 'failure') {
          toast.error('构建失败, 请查看 Cloudflare Pages 日志')
          break
        }
      } catch { /* 继续轮询 */ }
    }
    setDeployingIds(prev => {
      const next = new Set(prev)
      next.delete(catalogId)
      return next
    })
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-gray-900">产品图册</h1>
            <p className="text-[14px] text-gray-500 mt-1">管理产品图片、活动素材和平台发布图片</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 h-10 px-5 rounded-xl text-[14px] font-semibold text-white transition-all duration-200 hover:brightness-105" style={{ background: 'linear-gradient(135deg, #818CF8, #8B5CF6)' }}><Plus className="w-4 h-4" />新建图册</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: '图册总数', value: stats.totalCatalogs, icon: Folder, accent: '#8B5CF6', bg: '#F5F3FF' },
            { label: '产品总数', value: stats.totalProducts, icon: Package, accent: '#6366F1', bg: '#EEF2FF' },
            { label: '图片总数', value: stats.totalImages, icon: ImageIcon, accent: '#EC4899', bg: '#FDF2F8' },
            { label: '已发布图册', value: `${stats.publishedRatio}%`, icon: TrendingUp, accent: '#10B981', bg: '#ECFDF5' },
          ].map((s, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-[#EEF2F7] flex items-center px-5 gap-4 transition-shadow duration-200 hover:shadow-sm">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}><s.icon className="w-5 h-5" style={{ color: s.accent }} strokeWidth={1.8} /></div>
              <div><p className="text-[13px] text-gray-500 mb-0.5">{s.label}</p><p className="text-[24px] font-bold text-gray-900">{s.value}</p></div>
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-[2.5rem] p-3 shadow-sm border border-gray-100/80">
                <div className="h-7" />
                <div className="rounded-[1.25rem] aspect-[4/5] w-full mt-2 bg-gray-100 animate-pulse" />
                <div className="px-2 pt-4 pb-2 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
                  <div className="h-8 w-full rounded-lg bg-gray-100 animate-pulse mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : catalogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-[18px] font-medium text-gray-500 mb-2">还没有图册</p>
            <p className="text-[14px] text-gray-400 mb-6">创建第一个产品图册开始管理图片</p>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 h-10 px-5 rounded-xl text-[14px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #818CF8, #8B5CF6)' }}><Plus className="w-4 h-4" />新建图册</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
              {catalogs.map(c => (
                <PhoneCard
                  key={c.id}
                  catalog={c}
                  onView={() => setDrawerCatalog(c)}
                  onPublish={async () => {
                    setPublishing(c.id)
                    try {
                      const r = await fetch(`${API_BASE}/catalogs/${c.id}/publish`, { method: 'POST' })
                      const j = await r.json()
                      if (j.success) {
                        toast.success(j.data?.deployId ? '已提交构建部署，约20秒后生效' : '发布成功')
                        fetchData()
                        // 进入构建中间态
                        if (j.data?.deployId) {
                          setDeployingIds(prev => new Set(prev).add(c.id))
                          pollDeployStatus(c.id, j.data.deployId)
                        }
                      } else {
                        toast.error(j.message ?? '发布失败')
                      }
                    } catch { toast.error('发布失败') }
                    finally { setPublishing(null) }
                  }}
                  onCopyLink={() => {
                    const url = `${ECATALOG_BASE}/c/${c.id}`
                    try {
                      const ta = document.createElement('textarea')
                      ta.value = url
                      ta.style.position = 'fixed'
                      ta.style.left = '-9999px'
                      ta.style.top = '-9999px'
                      document.body.appendChild(ta)
                      ta.focus()
                      ta.select()
                      const ok = document.execCommand('copy')
                      document.body.removeChild(ta)
                      if (ok) { toast.success('图册链接已复制') } else { toast.error(url, { duration: 8000 }) }
                    } catch {
                      toast.error(url, { duration: 8000 })
                    }
                  }}
                  onDelete={() => { setDeleteTarget(c); setConfirmOpen(true) }}
                  publishing={publishing}
                  deploying={deployingIds.has(c.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 transition-colors disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p: number
                  if (totalPages <= 5) p = i + 1
                  else if (page <= 3) p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else p = page - 2 + i
                  return <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${p === page ? 'bg-white text-[#8B5CF6] shadow-sm' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}>{p}</button>
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </>
        )}
      </div>

      <CreateModal open={createOpen} onClose={() => { setCreateOpen(false); setNewName('') }} name={newName} onChangeName={setNewName} creating={creating} onCreate={handleCreate} />

      <CatalogDrawerComponent open={!!drawerCatalog} catalog={drawerCatalog} onClose={() => setDrawerCatalog(null)} onRefresh={fetchData} />

      <AnimatePresence>
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div className="absolute inset-0 bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-[400px] shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
              <h3 className="text-[16px] font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-[14px] text-gray-500 mb-6">删除「{deleteTarget?.name}」后，已发布的公开链接将失效。此操作不可撤销。</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmOpen(false)} className="h-9 px-4 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-gray-50">取消</button>
                <button onClick={handleDelete} className="h-9 px-4 rounded-xl text-[13px] font-medium text-white bg-red-500 hover:bg-red-600">确认删除</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
