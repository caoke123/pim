import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Trash2, MoreHorizontal,
  X, Check, Search, Eye, Copy, Loader2, StickyNote,
  Users as UsersIcon, FileText,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import type { DistributionListItem, CatalogListItem } from '@/api/types'
import DistributionDrawer, { DrawerShell } from '@/components/DistributionDrawer'

const PAGE_SIZE = 12
const ECATALOG_BASE = import.meta.env.VITE_ECATALOG_BASE_URL || `${window.location.protocol}//${window.location.hostname}:3010`

const spring = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 }

// ═══════════════════════════════════════════════════════════════════
// Distributions 主页面
// ═══════════════════════════════════════════════════════════════════

export default function Distributions() {
  const [items, setItems] = useState<DistributionListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [deployingIds, setDeployingIds] = useState<Set<string>>(new Set())

  async function load(p = page, k = keyword) {
    setLoading(true)
    try {
      const res = await api.getDistributions({ page: p, pageSize: PAGE_SIZE, keyword: k })
      setItems(res.data.items)
      setTotal(res.data.total)
      setPage(p)
    } catch (e) {
      toast.error('加载分销列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1, '') }, [])

  const onSearch = () => load(1, keyword)
  const onRefresh = () => load(page, keyword)

  async function handleDelete(id: string) {
    try {
      const res = await api.deleteDistribution(id)
      toast.success('已移除, 链接即将失效')
      if (res.data?.deployId) handleDeployStart(id, res.data.deployId)
      onRefresh()
    } catch (e) {
      toast.error('删除失败')
    }
  }

  function copyPublicUrl(url: string) {
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
      if (ok) { toast.success('链接已复制') } else { toast.error(url, { duration: 8000 }) }
    } catch {
      toast.error(url, { duration: 8000 })
    }
  }

  function copyEcatalogLink(id: string) {
    copyPublicUrl(`${ECATALOG_BASE}/distributions/${id}`)
  }

  /** 真实轮询 Cloudflare Pages 部署状态 */
  const handleDeployStart = (distId: string, deployId: string | null) => {
    if (!deployId) return
    setDeployingIds(prev => new Set(prev).add(distId))
    ;(async () => {
      const maxAttempts = 30
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000))
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/deploy/status/${deployId}`)
          const json = await res.json()
          if (json.code === 0 && json.data?.status === 'success') {
            toast.success('构建完成, 分销链接已生效')
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
        next.delete(distId)
        return next
      })
    })()
  }

  /** 创建分销时触发部署 */
  const handleCreateDeployStart = (deployId: string | null) => {
    if (!deployId) return
    handleDeployStart(items[0]?.id || '', deployId)
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 pt-6 pb-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>分销管理</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>为客户定制专属分销图册与价格表</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 h-10 rounded-full text-[13px] font-medium transition-all active:scale-95"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}>
          <Plus className="w-4 h-4" />
          新建分销
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 max-w-md flex items-center gap-2 px-3 h-10 rounded-xl"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <Search className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="搜索客户名 / 图册名…"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <button
          onClick={onSearch}
          className="px-4 h-10 rounded-xl text-[13px] font-medium transition-all active:scale-95"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
          搜索
        </button>
        <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>共 {total} 条</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32" style={{ color: 'var(--text-tertiary)' }}>
          加载中…
        </div>
      ) : items.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {items.map(item => (
              <DistributionCard
                key={item.id}
                item={item}
                onOpen={() => setOpenId(item.id)}
                onCopy={() => item.publicUrl && copyEcatalogLink(item.id)}
                onDelete={() => handleDelete(item.id)}
                deploying={deployingIds.has(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => load(Math.max(1, page - 1), keyword)}
            disabled={page <= 1}
            className="px-3 h-9 rounded-lg text-[12px] disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            上一页
          </button>
          <span className="text-[12px] px-2" style={{ color: 'var(--text-secondary)' }}>第 {page} 页 / 共 {Math.ceil(total / PAGE_SIZE)} 页</span>
          <button
            onClick={() => load(page + 1, keyword)}
            disabled={page * PAGE_SIZE >= total}
            className="px-3 h-9 rounded-lg text-[12px] disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            下一页
          </button>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <NewDistributionDrawer
            onClose={() => setShowCreate(false)}
            onRefresh={() => load(page, keyword)}
            onDeployStart={handleCreateDeployStart}
          />
        )}
        {openId && (
          <DistributionDrawer
            distributionId={openId}
            deploying={deployingIds.has(openId)}
            onClose={() => { setOpenId(null); onRefresh() }}
            onDeployTriggered={(deployId) => handleDeployStart(openId, deployId)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Distribution Card (iPhone Dynamic Island Capsule)
// — 1:1 正方形封面 + 灵动岛胶囊图册挂件 +
//   一行并归头像/姓名/备注 + 底部 查看/复制/三点 弹起菜单
// ═══════════════════════════════════════════════════════════════════

function DistributionCard({
  item, onOpen, onCopy, onDelete, deploying,
}: {
  item: DistributionListItem
  onOpen: () => void
  onCopy: () => void
  onDelete: () => Promise<void>
  deploying: boolean
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
        setShowConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const avatarChar = item.customerName.charAt(0).toUpperCase()
  const tagline = item.customerNotes || null

  function handleCopyClick() {
    if (item.publicUrl) {
      onCopy()
    } else {
      toast.error('请先在详情中发布图册')
    }
  }

  function renderPendant() {
    return (
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 w-auto max-w-[90%] transition-all duration-300 group-hover:top-3 group-hover:scale-[1.03]">
        <div className="bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-[0_12px_24px_rgba(0,0,0,0.35),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center gap-2 justify-center whitespace-nowrap">
          <span className="flex h-1.5 w-1.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
          </span>
          <span className="text-[9.5px] uppercase font-bold tracking-wider text-slate-400 font-mono shrink-0">
            图册
          </span>
          <span className="w-px h-3 bg-slate-800 shrink-0" />
          <span className="font-bold text-white text-[11px] tracking-tight truncate max-w-[125px]" title={item.catalogName}>
            {item.catalogName}
          </span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      onClick={onOpen}
      className="group relative flex flex-col overflow-hidden bg-white rounded-xl border border-slate-200/50 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-300/60 transition-all duration-300 cursor-pointer">

      {/* 1:1 square cover with Dynamic Island capsule */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        {item.catalogCoverImageUrl ? (
          <img
            src={item.catalogCoverImageUrl}
            alt={item.catalogName}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-slate-100">
            <FileText className="w-12 h-12 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-80" />

        {renderPendant()}
      </div>

      {/* Metadata sheet — inline header + action bar */}
      <div className="flex-1 p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-start gap-2 mb-3 min-w-0">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border text-[11px] font-semibold shadow-inner bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]/20 shrink-0 mt-0.5">
              {avatarChar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-display font-semibold text-[15px] text-gray-900 tracking-tight group-hover:text-[#635BFF] transition-colors duration-150 truncate max-w-[130px]">
                  {item.customerName}
                </h3>
                {tagline && (
                  <span className="text-[9px] text-slate-500 font-medium px-1.5 py-0.5 rounded bg-slate-100/60 border border-slate-200/30 truncate max-w-[110px]" title={tagline}>
                    {tagline}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1.5 mt-auto relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen() }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-normal rounded-lg border border-slate-200 text-slate-700 hover:text-[#635BFF] hover:border-[#635BFF]/30 hover:bg-[#635BFF]/5 active:bg-[#635BFF]/10 transition-all duration-150 focus:outline-none">
            <Eye className="w-3 h-3 text-slate-400 shrink-0" />
            查看
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); if (!deploying) handleCopyClick() }}
            disabled={deploying}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-normal rounded-lg border transition-all duration-150 focus:outline-none shadow-sm ${
              deploying
                ? 'border-orange-200 bg-orange-50 text-orange-600 opacity-70'
                : 'border-[#635BFF]/10 bg-[#635BFF]/5 text-[#635BFF] hover:bg-[#635BFF] hover:text-white shadow-[#635BFF]/5'
            }`}>
            {deploying ? (
              <>
                <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
                构建中...
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 shrink-0" />
                复制链接
              </>
            )}
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMenuOpen(!isMenuOpen)
                setShowConfirmDelete(false)
              }}
              className={`p-2 rounded-lg border transition-all duration-150 focus:outline-none ${
                isMenuOpen
                  ? 'border-[#635BFF] bg-[#635BFF]/5 text-[#635BFF]'
                  : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
              title="客商管理选项">
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.12 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-11 right-0 w-52 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-20 py-1.5">
                  {!showConfirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(true)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      移除分销客户席位
                    </button>
                  ) : (
                    <div className="p-3 space-y-2 bg-rose-50/50">
                      <div className="flex items-start gap-1 text-[11px] font-bold text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>确认移除该分销客户吗？</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        该客户的所有专属折让关系、授权图册将被永久撤销。
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={async () => {
                            setDeleting(true)
                            try {
                              await onDelete()
                            } finally {
                              setDeleting(false)
                              setIsMenuOpen(false)
                            }
                          }}
                          className="w-full py-1.5 text-[10px] font-bold rounded bg-rose-600 hover:bg-rose-700 text-white text-center shadow-sm disabled:opacity-60 flex items-center justify-center gap-1">
                          {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                          {deleting ? '移除中…' : '确认移除'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConfirmDelete(false)}
                          className="w-full py-1.5 text-[10px] font-semibold rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-center">
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24" style={{ color: 'var(--text-tertiary)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--bg-surface)' }}>
        <UsersIcon className="w-7 h-7" />
      </div>
      <p className="text-[14px] mb-1" style={{ color: 'var(--text-secondary)' }}>还没有分销记录</p>
      <p className="text-[12px] mb-5">为客户创建专属分销图册</p>
      <button
        onClick={onCreate}
        className="px-4 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95 flex items-center gap-1.5"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
        <Plus className="w-3.5 h-3.5" />
        新建分销
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// New Distribution Drawer — 2-step unified flow
//   create → bind catalog
// ═══════════════════════════════════════════════════════════════════

const ACCENT_PURPLE = '#8B7FFF'

function NewDistributionDrawer({ onClose, onRefresh, onDeployStart }: { onClose: () => void; onRefresh: () => void; onDeployStart?: (deployId: string | null) => void }) {
  const [view, setView] = useState<'create' | 'bind'>('create')
  const [customerId, setCustomerId] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (!name.trim()) { toast.error('请输入客户名称'); return }
    setSubmitting(true)
    try {
      const res = await api.createCustomer({
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        wechat: wechat.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setCustomerId(res.data.id)
      setView('bind')
      toast.success('客户基础信息已创建，请继续绑定关联图册', { duration: 3000 })
      onRefresh()
    } catch (e) {
      toast.error('创建失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Create view ──

  const createForm = (
    <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 flex-none" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>新建分销客户</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>填写客户基础信息</p>
        </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
            <div>
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                客户名称<span style={{ color: ACCENT_PURPLE, marginLeft: 2 }}>*</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="例：永辉百货"
                className="w-full h-9 px-3 rounded-xl text-[13px] outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                onFocus={e => (e.currentTarget.style.borderColor = ACCENT_PURPLE)}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
            </div>
            <div>
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>联系人</label>
              <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="张总"
                className="w-full h-9 px-3 rounded-xl text-[13px] outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                onFocus={e => (e.currentTarget.style.borderColor = ACCENT_PURPLE)}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>联系电话</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="138xxxxxxxx"
                  className="w-full h-9 px-3 rounded-xl text-[13px] outline-none transition-colors"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = ACCENT_PURPLE)}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
              </div>
              <div>
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>微信</label>
                <input type="text" value={wechat} onChange={e => setWechat(e.target.value)} placeholder="zhangsan888"
                  className="w-full h-9 px-3 rounded-xl text-[13px] outline-none transition-colors"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = ACCENT_PURPLE)}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>备注</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="日本站客户，按月结算" rows={2}
                className="w-full px-3 py-2 rounded-xl text-[13px] outline-none resize-none transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                onFocus={e => (e.currentTarget.style.borderColor = ACCENT_PURPLE)}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 40 }}>
              <button onClick={onClose}
                className="px-4 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
                取消
              </button>
              <button onClick={handleCreate} disabled={submitting}
                className="px-4 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
                style={{
                  backgroundColor: ACCENT_PURPLE,
                  color: '#FFFFFF',
                  animation: submitting ? 'none' : 'breathe-glow 2s infinite ease-in-out',
                }}>
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                下一步：绑定图册
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )

  const bindView = (
    <motion.div key="bind" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 flex-none" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>绑定图册</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>为 {name || '客户'} 选择一个产品图册</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <BindCatalogView customerId={customerId!}
            onBound={(deployId) => { onRefresh(); onDeployStart?.(deployId ?? null); setTimeout(() => onClose(), 700) }} />
        </div>
      </div>
    </motion.div>
  )

  return (
    <DrawerShell onClose={onClose}>
      <style>{`@keyframes breathe-glow{0%,100%{box-shadow:0 0 0 0 rgba(139,127,255,0.4);transform:scale(1)}50%{box-shadow:0 0 18px 4px rgba(139,127,255,0.3);transform:scale(1.02)}}`}</style>
      <AnimatePresence mode="wait">
        {view === 'create' && createForm}
        {view === 'bind' && bindView}
      </AnimatePresence>
    </DrawerShell>
  )
}

// ── Catalog selection view for new customers ──

function BindCatalogView({ customerId, onBound }: { customerId: string; onBound: (deployId: string | null) => void }) {
  const [catalogs, setCatalogs] = useState<CatalogListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [binding, setBinding] = useState<string | null>(null)

  const PAGE = 12

  async function load(p = page, k = keyword) {
    try {
      const res = await api.getCatalogs({ page: p, pageSize: PAGE, keyword: k || undefined } as any)
      setCatalogs(res.data.items)
      setTotal(res.data.total)
      setPage(p)
    } catch {
      toast.error('加载图册失败')
    }
  }

  useEffect(() => { load(1, '') }, [])

  async function handleBind(catalogId: string) {
    setBinding(catalogId)
    try {
      const res = await api.createDistribution({ customerId, catalogId })
      toast.success('图册绑定成功，分销客户创建完毕！', { duration: 3000 })
      onBound(res.data?.deployId ?? null)
    } catch {
      toast.error('绑定失败')
    } finally {
      setBinding(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3 h-10 rounded-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <Search className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input type="text" placeholder="搜索图册名称…" value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(1, keyword)}
          className="flex-1 bg-transparent outline-none text-[12px]"
          style={{ color: 'var(--text-primary)' }} />
        <button onClick={() => load(1, keyword)}
          className="px-3 h-7 rounded-lg text-[11px] font-medium transition-all active:scale-95"
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>搜索</button>
      </div>

      {catalogs.length === 0 ? (
        <div className="text-center text-[12px] py-12" style={{ color: 'var(--text-tertiary)' }}>暂无已发布图册</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, 220px)', justifyContent: 'flex-start' }}>
          {catalogs.map(c => {
            const b = binding === c.id
            const imagesCount = c.productCount * 6
            return (
              <button key={c.id} type="button" disabled={binding !== null}
                onClick={() => handleBind(c.id)}
                className="flex flex-col text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                style={{
                  borderRadius: '2.5rem', backgroundColor: '#ffffff',
                  border: '2px solid rgba(247,115,20,0.8)',
                  boxShadow: '0 8px 30px rgba(247,115,20,0.12)', padding: 12,
                }}>
                <div className="relative w-full overflow-hidden bg-gray-100 shrink-0"
                  style={{ height: 180, borderRadius: '1rem' }}>
                  {c.coverImageUrl || c.fallbackCoverUrl ? (
                    <img src={(c.coverImageUrl || c.fallbackCoverUrl)!} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
                      <FileText className="w-8 h-8" />
                    </div>
                  )}
                  {b && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7c3aed' }} />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => load(Math.max(1, page - 1), keyword)} disabled={page <= 1}
            className="px-3 h-8 rounded-lg text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            上一页
          </button>
          <button onClick={() => load(page + 1, keyword)} disabled={page >= totalPages}
            className="px-3 h-8 rounded-lg text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
