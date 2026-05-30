import { useState, useEffect } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import PageContainer from '@/components/PageContainer'

const API_BASE = 'http://localhost:8000/api/v1'

const levelStyle: Record<string, { dot: string; bg: string; label: string }> = {
  success: { dot: '#34C78A', bg: 'rgba(52,199,138,0.1)', label: '成功' },
  info: { dot: '#635BFF', bg: 'rgba(99,91,255,0.1)', label: '信息' },
  warning: { dot: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: '警告' },
  error: { dot: '#F87171', bg: 'rgba(248,113,113,0.1)', label: '错误' },
}

const ACTION_LABELS: Record<string, string> = {
  'UPDATE_SKU': '更新SKU',
  'UPDATE_PRODUCT': '更新产品',
  'UPDATE_BASIC': '更新基础信息',
  'DELETE_PRODUCT': '删除产品',
  'PUBLISH_TASK': '发布任务',
  'UPDATE_PRICE': '更新价格',
  'UPDATE_STOCK': '更新库存',
  'UPDATE_TRANSLATE': '更新译文',
}

const FIELD_LABELS: Record<string, string> = {
  'sellingPrice': '售价',
  'costPrice': '成本价',
  'stock': '库存',
  'weightG': '重量',
  'nameZh': 'SKU中文名',
  'nameZhCustom': 'SKU自定义中文名',
  'fieldName': '字段',
}

const taskStatus: Record<string, { label: string; c: string }> = {
  pending: { label: '排队中', c: '#6B7280' },
  running: { label: '执行中', c: '#F59E0B' },
  success: { label: '已完成', c: '#34C78A' },
  failed:  { label: '失败',   c: '#F87171' },
}

interface OpLog {
  id: string; operator: string; spuCode: string | null; action: string
  fieldName: string | null; oldValue: string | null; newValue: string | null
  level: string; message: string; createdAt: string
}

interface PubTask {
  id: string; platform: string; productIds: string[]; status: string
  logLines: { nodeId: string; message: string; timestamp: string }[] | null
  error: string | null; createdAt: string
}

const OP_PAGE_SIZE = 20
const PUB_PAGE_SIZE = 10

export default function Logs() {
  const [tab, setTab] = useState<'operation' | 'publish'>('operation')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  // 操作日志
  const [opLogs, setOpLogs] = useState<OpLog[]>([])
  const [opTotal, setOpTotal] = useState(0)
  const [opPage, setOpPage] = useState(1)
  const [opLoading, setOpLoading] = useState(true)

  // 发布日志
  const [pubTasks, setPubTasks] = useState<PubTask[]>([])
  const [pubTotal, setPubTotal] = useState(0)
  const [pubPage, setPubPage] = useState(1)
  const [pubLoading, setPubLoading] = useState(true)

  const fetchOpLogs = (page: number) => {
    setOpLoading(true)
    fetch(`${API_BASE}/logs/operations?page=${page}&pageSize=${OP_PAGE_SIZE}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setOpLogs(res.data.items)
          setOpTotal(res.data.total)
          setOpPage(res.data.page)
        }
      }).catch(() => {}).finally(() => setOpLoading(false))
  }

  const fetchPubLogs = (page: number) => {
    setPubLoading(true)
    fetch(`${API_BASE}/publish/tasks?page=${page}&pageSize=${PUB_PAGE_SIZE}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setPubTasks(res.data.items)
          setPubTotal(res.data.total)
          setPubPage(res.data.page)
        }
      }).catch(() => {}).finally(() => setPubLoading(false))
  }

  useEffect(() => { fetchOpLogs(1) }, [])
  useEffect(() => { if (tab === 'publish') fetchPubLogs(1) }, [tab])

  const totalOpPages = Math.ceil(opTotal / OP_PAGE_SIZE)
  const totalPubPages = Math.ceil(pubTotal / PUB_PAGE_SIZE)

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    return `${Math.floor(mins / 60)}小时前`
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-medium tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>日志中心</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>操作日志与发布日志</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 rounded-lg p-0.5" style={{ backgroundColor: 'var(--bg-surface)', width: 'fit-content' }}>
        {[
          { key: 'operation' as const, label: '操作日志', count: opTotal },
          { key: 'publish' as const, label: '发布日志', count: pubTotal },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all"
            style={{ backgroundColor: tab === t.key ? 'var(--bg-elevated)' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* 操作日志 Tab */}
      {tab === 'operation' && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          {opLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : opLogs.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>暂无操作日志</div>
          ) : (
            opLogs.map((l, i) => {
              const s = levelStyle[l.level] || levelStyle.info
              return (
                <div key={l.id} className="flex items-start gap-3 px-4 py-3 transition-colors"
                  style={{ borderBottom: i < opLogs.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium mt-0.5 shrink-0" style={{ backgroundColor: s.bg, color: s.dot }}>{s.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{l.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {l.spuCode && <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{l.spuCode}</span>}
                      <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--accent)' }}>
                        {ACTION_LABELS[l.action] ?? l.action}
                      </span>
                      {l.fieldName && (
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {FIELD_LABELS[l.fieldName] ?? l.fieldName}
                          {l.oldValue && l.newValue && (
                            <span> {l.oldValue} → {l.newValue}</span>
                          )}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{l.operator}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(l.createdAt)}</span>
                </div>
              )
            })
          )}
          {/* 分页 */}
          {totalOpPages > 1 && (
            <Pagination page={opPage} totalPages={totalOpPages} onPageChange={fetchOpLogs} />
          )}
        </div>
      )}

      {/* 发布日志 Tab */}
      {tab === 'publish' && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          {pubLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : pubTasks.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>暂无发布记录</div>
          ) : (
            pubTasks.map((t, i) => {
              const s = taskStatus[t.status] || taskStatus.pending
              return (
                <div key={t.id}>
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{ borderBottom: i < pubTasks.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                    onClick={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.c }} />
                    <div className="flex-1">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{t.platform} · {(t.productIds || []).length}个产品</span>
                      <span className="text-[10px] ml-2 font-mono" style={{ color: 'var(--text-tertiary)' }}>{t.id.slice(0, 8)}...</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: s.c, backgroundColor: `${s.c}15` }}>{s.label}</span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(t.createdAt)}</span>
                  </div>
                  {expandedTask === t.id && t.logLines && Array.isArray(t.logLines) && t.logLines.length > 0 && (
                    <div className="px-4 py-3 font-mono text-[10px] leading-relaxed" style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border-default)' }}>
                      {t.logLines.map((l: any, j: number) => (
                        <div key={j} style={{ color: 'var(--text-secondary)' }}>{l.nodeId} {l.message}</div>
                      ))}
                      {t.error && <div className="mt-2" style={{ color: '#F87171' }}>{t.error}</div>}
                    </div>
                  )}
                </div>
              )
            })
          )}
          {/* 分页 */}
          {totalPubPages > 1 && (
            <Pagination page={pubPage} totalPages={totalPubPages} onPageChange={fetchPubLogs} />
          )}
        </div>
      )}
    </PageContainer>
  )
}

function Pagination({ page, totalPages, onPageChange }: {
  page: number; totalPages: number; onPageChange: (p: number) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-default)' }}>
      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        第 {page} / {totalPages} 页
      </span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-30 transition-colors"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
          className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-30 transition-colors"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
