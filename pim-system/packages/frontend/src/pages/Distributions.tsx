import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Trash2, Send, ExternalLink, MoreHorizontal,
  X, Check, Search, Phone, MessageCircle, Pencil, Eye, Copy,
  Users as UsersIcon, Package as PackageIcon, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import type {
  DistributionListItem, DistributionDetail, CustomerListItem,
  CatalogListItem, DistributionSkuItem,
} from '@/api/types'
import DistributionDrawer from '@/components/DistributionDrawer'

const PAGE_SIZE = 12

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
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)

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
    if (!confirm('确定删除该分销记录吗？此操作不可撤销。')) return
    try {
      await api.deleteDistribution(id)
      toast.success('已删除')
      onRefresh()
    } catch (e) {
      toast.error('删除失败')
    }
  }

  async function handlePublish(id: string) {
    setPublishing(id)
    try {
      const res = await api.publishDistribution(id)
      await navigator.clipboard.writeText(res.data.publicUrl ?? '')
      toast.success('已发布，链接已复制到剪贴板')
      onRefresh()
    } catch (e) {
      toast.error('发布失败')
    } finally {
      setPublishing(null)
    }
  }

  function copyPublicUrl(url: string) {
    navigator.clipboard.writeText(url)
    toast.success('链接已复制')
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {items.map(item => (
            <DistributionCard
              key={item.id}
              item={item}
              onOpen={() => setOpenId(item.id)}
              onPublish={() => handlePublish(item.id)}
              onCopy={() => item.publicUrl && copyPublicUrl(item.publicUrl)}
              onDelete={() => handleDelete(item.id)}
              publishing={publishing === item.id}
              menuOpen={moreMenuId === item.id}
              setMenuOpen={setMoreMenuId}
            />
          ))}
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
          <CreateDistributionModal
            onClose={() => setShowCreate(false)}
            onSuccess={() => { setShowCreate(false); load(1, '') }}
          />
        )}
        {openId && (
          <DistributionDrawer
            distributionId={openId}
            onClose={() => { setOpenId(null); onRefresh() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Distribution Card (Business Profile Card)
// ═══════════════════════════════════════════════════════════════════

function DistributionCard({
  item, onOpen, onPublish, onCopy, onDelete, publishing, menuOpen, setMenuOpen,
}: {
  item: DistributionListItem
  onOpen: () => void
  onPublish: () => void
  onCopy: () => void
  onDelete: () => void
  publishing: boolean
  menuOpen: boolean
  setMenuOpen: (id: string | null) => void
}) {
  const isActive = item.status === 'active'

  return (
    <motion.div
      layout
      onClick={onOpen}
      whileHover={{ y: -2 }}
      transition={spring}
      className="group relative rounded-2xl p-5 cursor-pointer flex flex-col gap-3"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          {item.catalogCoverImageUrl ? (
            <img src={item.catalogCoverImageUrl} alt={item.catalogName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
              <FileText className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {item.customerName}
            </h3>
            <StatusBadge active={isActive} />
          </div>
          <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{item.catalogName}</p>
        </div>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(menuOpen ? null : item.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-36 rounded-xl py-1 z-20"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
                <button
                  onClick={() => { setMenuOpen(null); onDelete() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors"
                  style={{ color: 'var(--danger)' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                  删除分销
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 py-3" style={{ borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }}>
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <PackageIcon className="w-3.5 h-3.5" />
          {item.productCount} 个产品
        </div>
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <UsersIcon className="w-3.5 h-3.5" />
          {item.operator ?? 'XP'}
        </div>
      </div>

      {item.publicUrl && (
        <button
          onClick={e => { e.stopPropagation(); onCopy() }}
          className="flex items-center gap-1.5 text-[11px] truncate transition-colors"
          style={{ color: 'var(--text-tertiary)' }}>
          <Link2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{item.publicUrl}</span>
        </button>
      )}

      <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
        {item.publicUrl ? (
          <button
            onClick={onCopy}
            className="flex-1 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-soft)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
            <Copy className="w-3.5 h-3.5" />
            复制链接
          </button>
        ) : (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="flex-1 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}>
            <Send className="w-3.5 h-3.5" />
            {publishing ? '发布中…' : '发布分销'}
          </button>
        )}
        <button
          onClick={onOpen}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0"
      style={{
        backgroundColor: active ? 'var(--success-bg)' : 'var(--warning-bg)',
        color: active ? 'var(--success)' : 'var(--warning)',
      }}>
      {active ? '启用' : '停用'}
    </span>
  )
}

function Link2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
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
// Create Distribution Modal
// ═══════════════════════════════════════════════════════════════════

function CreateDistributionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [catalogs, setCatalogs] = useState<CatalogListItem[]>([])
  const [customerId, setCustomerId] = useState('')
  const [catalogId, setCatalogId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', contactPerson: '', phone: '', wechat: '', notes: '' })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  useEffect(() => {
    api.getCustomers({ pageSize: 100 }).then(r => setCustomers(r.data.items)).catch(() => {})
    api.getCatalogs({ pageSize: 100 }).then(r => setCatalogs(r.data.items)).catch(() => {})
  }, [])

  const filteredCustomers = useMemo(() => {
    const k = customerSearch.toLowerCase().trim()
    if (!k) return customers
    return customers.filter(c => c.name.toLowerCase().includes(k) || (c.contactPerson ?? '').toLowerCase().includes(k))
  }, [customers, customerSearch])

  const filteredCatalogs = useMemo(() => {
    const k = catalogSearch.toLowerCase().trim()
    if (!k) return catalogs
    return catalogs.filter(c => c.name.toLowerCase().includes(k))
  }, [catalogs, catalogSearch])

  async function handleCreateCustomer() {
    if (!newCustomer.name.trim()) {
      toast.error('请输入客户名称')
      return
    }
    setCreatingCustomer(true)
    try {
      const res = await api.createCustomer({
        name: newCustomer.name.trim(),
        contactPerson: newCustomer.contactPerson.trim() || undefined,
        phone: newCustomer.phone.trim() || undefined,
        wechat: newCustomer.wechat.trim() || undefined,
        notes: newCustomer.notes.trim() || undefined,
      })
      setCustomers(prev => [res.data, ...prev])
      setCustomerId(res.data.id)
      setShowNewCustomer(false)
      setNewCustomer({ name: '', contactPerson: '', phone: '', wechat: '', notes: '' })
      toast.success('客户已创建')
    } catch (e) {
      toast.error('创建客户失败')
    } finally {
      setCreatingCustomer(false)
    }
  }

  async function handleSubmit() {
    if (!customerId) { toast.error('请选择客户'); return }
    if (!catalogId) { toast.error('请选择图册'); return }
    setSubmitting(true)
    try {
      await api.createDistribution({ customerId, catalogId })
      toast.success('分销已创建')
      onSuccess()
    } catch (e) {
      toast.error('创建分销失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'var(--overlay)' }}
        onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={spring}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[85vh] overflow-y-auto rounded-3xl"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>新建分销</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>选择客户</label>
              <button
                onClick={() => setShowNewCustomer(true)}
                className="text-[12px] font-medium flex items-center gap-1"
                style={{ color: 'var(--accent)' }}>
                <Plus className="w-3 h-3" />新建客户
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 h-9 rounded-xl mb-2"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <Search className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              <input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="搜索客户…"
                className="flex-1 bg-transparent outline-none text-[12px]"
                style={{ color: 'var(--text-primary)' }} />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl space-y-1 p-1"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              {filteredCustomers.length === 0 ? (
                <p className="text-[12px] text-center py-4" style={{ color: 'var(--text-tertiary)' }}>暂无客户，请新建</p>
              ) : filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCustomerId(c.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                  style={{
                    backgroundColor: customerId === c.id ? 'var(--accent-soft)' : 'transparent',
                    color: 'var(--text-primary)',
                  }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate">{c.name}</p>
                    {c.contactPerson && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.contactPerson}</p>}
                  </div>
                  {customerId === c.id && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>选择图册</label>
            <div className="flex items-center gap-2 px-3 h-9 rounded-xl mb-2"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <Search className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              <input
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="搜索图册…"
                className="flex-1 bg-transparent outline-none text-[12px]"
                style={{ color: 'var(--text-primary)' }} />
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto">
              {filteredCatalogs.length === 0 ? (
                <p className="col-span-3 text-[12px] text-center py-4" style={{ color: 'var(--text-tertiary)' }}>暂无图册</p>
              ) : filteredCatalogs.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCatalogId(c.id)}
                  className="flex flex-col gap-1.5 p-2 rounded-xl text-left transition-all"
                  style={{
                    backgroundColor: catalogId === c.id ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    border: catalogId === c.id ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                  }}>
                  <div className="w-full aspect-[4/5] rounded-md overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-base)' }}>
                    {c.coverImageUrl ? (
                      <img src={c.coverImageUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
                        <FileText className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{c.productCount} 个产品</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
            {submitting ? '创建中…' : '创建分销'}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showNewCustomer && (
          <NewCustomerModal
            onClose={() => setShowNewCustomer(false)}
            onCreated={c => { setCustomers(prev => [c, ...prev]); setCustomerId(c.id); setShowNewCustomer(false) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// New Customer Modal
// ═══════════════════════════════════════════════════════════════════

function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: CustomerListItem) => void }) {
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
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
      onCreated(res.data)
      toast.success('客户已创建')
    } catch (e) {
      toast.error('创建客户失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'var(--overlay)' }}
        onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={spring}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] rounded-3xl"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>新建客户</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <Field label="客户名称 *" value={name} onChange={setName} placeholder="例：永辉首饰" required />
          <Field label="联系人" value={contactPerson} onChange={setContactPerson} placeholder="姓名 / 职位" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="电话" value={phone} onChange={setPhone} placeholder="138xxxx" />
            <Field label="微信" value={wechat} onChange={setWechat} placeholder="微信号" />
          </div>
          <Field label="备注" value={notes} onChange={setNotes} placeholder="合作偏好 / 区域等" textarea />
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 h-9 rounded-full text-[12px] font-medium transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
            {submitting ? '创建中…' : '保存客户'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

function Field({ label, value, onChange, placeholder, textarea, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; required?: boolean
}) {
  return (
    <div>
      <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-xl text-[12px] outline-none resize-none"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full h-9 px-3 rounded-xl text-[12px] outline-none"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
      )}
    </div>
  )
}
