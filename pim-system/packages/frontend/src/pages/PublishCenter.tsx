import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import { useTheme } from '@/hooks/useTheme'
import { api } from '@/api/client'
import type { ProductListItem } from '@/api/types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/v1'

const platforms = [
  { name: 'Shopee', active: true, port: 13000 },
  { name: 'TikTok', active: false },
  { name: 'Temu', active: false },
]

const statusBadge: Record<string, { label: string; bg: string; dot: string }> = {
  pending:  { label: '排队中', bg: 'rgba(107,114,128,0.1)', dot: '#6B7280' },
  running:  { label: '进行中', bg: 'rgba(34,211,238,0.1)', dot: '#22d3ee' },
  success:  { label: '成功',   bg: 'rgba(52,199,138,0.1)', dot: '#34C78A' },
  failed:   { label: '失败',   bg: 'rgba(248,113,113,0.1)', dot: '#F87171' },
}

interface PublishProduct {
  id: string
  name: string
  spuCode: string
  skuCount: number
  mainImage: string | null
}

interface HistoryTask {
  id: string
  name: string
  status: string
  createdAt: string
  error?: string | null
}

interface SSELog {
  nodeId: string
  message: string
  timestamp: string
}

interface LogEntry {
  nodeId: string
  message: string
  status: 'active' | 'done' | 'pending'
}

export default function PublishCenter() {
  const { theme } = useTheme()
  const [products, setProducts] = useState<PublishProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState('Shopee')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [terminal, setTerminal] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [terminalStatus, setTerminalStatus] = useState<string>('')
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([])
  const [publishing, setPublishing] = useState(false)
  const [hoveredImg, setHoveredImg] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const abortRef = useRef<AbortController | null>(null)

  // 加载产品列表
  useEffect(() => {
    api.getProducts({ pageSize: 50 }).then(res => {
      if (res.success && res.data?.items) {
        setProducts(res.data.items.map((item: ProductListItem) => ({
          id: item.id,
          name: item.title,
          spuCode: item.spuCode,
          skuCount: item.skuCount,
          mainImage: item.mainImageUrl,
        })))
      }
    }).catch(() => {}).finally(() => setProductsLoading(false))

    // 检查是否有进行中的任务，自动重连SSE
    fetch(`${API_BASE}/publish/tasks?status=running`).then(r => r.json()).then(res => {
      if (res.success && res.data.items.length > 0) {
        const runningTask = res.data.items[0]
        reconnectToRunningTask(runningTask)
      }
    }).catch(() => {})
  }, [])

  // 加载历史任务
  const loadHistory = useCallback(() => {
    fetch(`${API_BASE}/publish/tasks?pageSize=10`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setHistoryTasks(res.data.items.map((t: any) => ({
            id: t.id,
            name: `${t.platform} · ${(t.productIds || []).length}个产品`,
            status: t.status,
            createdAt: t.createdAt,
            error: t.error,
          })))
        }
      }).catch(() => {})
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // 重连进行中的任务
  const reconnectToRunningTask = useCallback(async (task: any) => {
    setTerminal(true)
    setTerminalStatus('RUNNING')
    setPublishing(true)

    // 加载历史日志
    const logs: LogEntry[] = []
    if (task.logLines && Array.isArray(task.logLines)) {
      for (const l of task.logLines) {
        logs.push({ nodeId: l.nodeId || '', message: l.message || '', status: 'done' })
      }
    }
    setTerminalLogs(logs)
    setProgress(task.progress || 0)

    // 建立 SSE 连接
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const sseRes = await fetch(`${API_BASE}/publish/tasks/${task.id}/stream`, { signal: abort.signal })
      if (!sseRes.body) return

      const reader = sseRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.nodeId && parsed.message) {
                setTerminalLogs(prev => {
                  const updated = prev.map(l => ({ ...l, status: 'done' as const }))
                  return [...updated, { nodeId: parsed.nodeId, message: parsed.message, status: 'active' }]
                })
              }
              if (typeof parsed.progress === 'number') setProgress(parsed.progress)
              if (parsed.status) {
                setTerminalStatus(parsed.status.toUpperCase())
                if (parsed.status === 'failed' && parsed.error) {
                  setTerminalLogs(prev => [...prev, { nodeId: 'ERROR', message: parsed.error, status: 'done' }])
                }
                if (parsed.status === 'success') setProgress(100)
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setTerminalStatus('FAILED')
      }
    } finally {
      setPublishing(false)
      loadHistory()
    }
  }, [loadHistory])

  const toggleProduct = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const startPublish = async () => {
    setShowConfirm(false)
    setTerminal(true)
    setTerminalLogs([])
    setProgress(0)
    setTerminalStatus('RUNNING')
    setPublishing(true)

    // 清理旧连接
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      // 1. 创建发布任务
      const createRes = await fetch(`${API_BASE}/publish/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform.toLowerCase(),
          productIds: Array.from(selectedIds),
        }),
      })
      const createData = await createRes.json()

      if (!createData.success) {
        setTerminalLogs([{ nodeId: 'ERROR', message: `创建任务失败: ${createData.message}`, status: 'done' }])
        setTerminalStatus('FAILED')
        setPublishing(false)
        return
      }

      const task = createData.data
      setTerminalLogs([{ nodeId: 'SYSTEM', message: `任务 ${task.id.slice(0, 8)}... 已创建, 平台: ${task.platform}`, status: 'done' }])

      // 如果 Agent 未运行
      if (task.status === 'failed') {
        const errMsg = task.error || '本地发布Agent未运行'
        setTerminalLogs(prev => [...prev, { nodeId: 'ERROR', message: `${errMsg}，请启动分拣系统`, status: 'done' }])
        setTerminalStatus('FAILED')
        setPublishing(false)
        loadHistory()
        return
      }

      // 2. 连接 SSE
      setTerminalLogs(prev => [...prev, { nodeId: 'SYSTEM', message: '正在连接 Agent...', status: 'active' }])
      const sseRes = await fetch(`${API_BASE}/publish/tasks/${task.id}/stream`, {
        signal: abort.signal,
      })

      if (!sseRes.body) {
        setTerminalStatus('FAILED')
        setPublishing(false)
        return
      }

      const reader = sseRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim()
            // 等待下一行 data
            continue
          }
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data) as SSELog & { progress?: number; status?: string; error?: string }

              if (parsed.nodeId && parsed.message) {
                setTerminalLogs(prev => {
                  const updated = prev.map(l => ({ ...l, status: 'done' as const }))
                  return [...updated, { nodeId: parsed.nodeId, message: parsed.message, status: 'active' }]
                })
              }
              if (typeof parsed.progress === 'number') {
                setProgress(parsed.progress)
              }
              if (parsed.status) {
                setTerminalStatus(parsed.status.toUpperCase())
                if (parsed.status === 'failed' && parsed.error) {
                  setTerminalLogs(prev => [...prev, { nodeId: 'ERROR', message: parsed.error!, status: 'done' }])
                }
                if (parsed.status === 'success') {
                  setProgress(100)
                }
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setTerminalLogs(prev => [...prev, { nodeId: 'ERROR', message: `连接中断: ${err.message}`, status: 'done' }])
        setTerminalStatus('FAILED')
      }
    } finally {
      setPublishing(false)
      loadHistory()
    }
  }

  // 相对时间格式化
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}小时前`
    return `${Math.floor(hrs / 24)}天前`
  }

  return (
    <PageContainer>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <h1 className="text-[28px] font-semibold tracking-tight text-gray-900 mb-1 shrink-0">发布中心</h1>
      <p className="text-[13px] mb-6 shrink-0" style={{ color: 'var(--text-tertiary)' }}>选品 → 触发发布 → 查看任务状态</p>

      <div className="flex gap-6 min-h-0 flex-1" style={{ alignItems: 'stretch' }}>
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div>
            <span className="text-[13px] tracking-wide block mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>选择平台</span>
            <div className="flex gap-3 items-end">
              {platforms.map(p => (
                <button key={p.name} onClick={() => p.active && setSelectedPlatform(p.name)}
                  className={`rounded-lg px-5 py-3 text-left transition-all duration-200 ${p.active ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                  style={{ backgroundColor: selectedPlatform === p.name && p.active ? 'var(--bg-subtle)' : 'var(--bg-elevated)', border: selectedPlatform === p.name && p.active ? '2px solid var(--accent)' : '1px solid var(--border-default)' }}>
                  <p className="text-[14px] font-semibold" style={{ color: p.active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{p.name}</p>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{p.active ? `端口: ${p.port}` : '未配置'}</p>
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={() => setShowConfirm(true)} disabled={selectedIds.size === 0 || publishing}
                className="flex items-center gap-1.5 h-9 px-5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                <Play className="w-3.5 h-3.5" />
                {publishing ? '发布中...' : '开始发布'}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col mt-6">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-[13px] tracking-wide" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>选择产品</span>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>已选 {selectedIds.size} 个产品</span>
            </div>
            <div className="flex-1 rounded-lg overflow-hidden min-h-0" style={{ border: '1px solid var(--border-default)' }}>
              <div className="h-full overflow-y-auto">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-[12px] ml-2" style={{ color: 'var(--text-tertiary)' }}>加载产品列表...</span>
                  </div>
                ) : productsError ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <span className="text-[12px]" style={{ color: 'var(--danger)' }}>{productsError}</span>
                    <button onClick={() => { setProductsError(null); setProductsLoading(true); api.getProducts({ pageSize: 50 }).then(res => {
                      setProducts(res.data.items.map((item: ProductListItem) => ({ id: item.id, name: item.title, spuCode: item.spuCode, skuCount: item.skuCount, mainImage: item.mainImageUrl })))
                    }).catch((err: Error) => setProductsError(err.message || '加载产品失败')).finally(() => setProductsLoading(false)) }}
                      className="text-[13px] underline" style={{ color: 'var(--accent)' }}>重试</button>
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-8 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>暂无产品</div>
                ) : (
                  products.map(p => (
                    <div key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: selectedIds.has(p.id) ? 'var(--bg-subtle)' : 'transparent' }}
                      onClick={() => toggleProduct(p.id)}
                      onMouseEnter={e => { if (!selectedIds.has(p.id)) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface)' }}
                      onMouseLeave={e => { if (!selectedIds.has(p.id)) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => {}} className="w-4 h-4 rounded" style={{ accentColor: 'var(--accent)' }} />
                      {p.mainImage ? (
                        <div className="relative shrink-0">
                          <img src={p.mainImage} alt="" className="w-9 h-9 rounded object-cover cursor-pointer"
                            onMouseEnter={e => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setHoverPos({ x: rect.left, y: rect.bottom + 8 })
                              setHoveredImg(p.mainImage)
                            }}
                            onMouseLeave={() => setHoveredImg(null)}
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                          <span className="text-[7px]" style={{ color: 'var(--text-tertiary)' }}>无图</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <p className="text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{p.spuCode} · {p.skuCount} SKU</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="pt-3 mt-auto pb-4" />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-[340px] shrink-0 flex flex-col gap-4">
          <PublishTerminal
            active={terminal}
            logs={terminalLogs}
            progress={progress}
            status={terminalStatus}
          />

          <div className="flex-1 min-h-0 flex flex-col justify-end">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>最近任务</span>
              <button onClick={loadHistory} className="text-[12px]" style={{ color: 'var(--accent)' }}>刷新</button>
            </div>
            <div className="rounded-lg overflow-hidden" style={{
              border: '1px solid var(--border-default)',
              ...(theme === 'light' && { backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)' }),
            }}>
              {historyTasks.length === 0 ? (
                <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>暂无发布记录</div>
              ) : (
                historyTasks.slice(0, 5).map((t, i) => {
                  const s = statusBadge[t.status] || statusBadge.pending
                  return (
                    <div key={t.id} className="flex items-center justify-between px-3 py-1.5 transition-colors"
                      style={{ borderBottom: i < Math.min(historyTasks.length, 5) - 1 ? '1px solid var(--border-default)' : 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                      <div className="flex-1 min-w-0 mr-2">
                        <span className="text-[13px] block truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                        <span className="text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(t.createdAt)}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0"
                        style={{ backgroundColor: s.bg, color: s.dot }}>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: s.dot }} />{s.label}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--overlay)' }}>
          <div className="rounded-xl p-6 max-w-[400px] w-full" style={{ backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>确认发布</h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              目标平台：{selectedPlatform}<br />
              选中产品：{selectedIds.size} 个
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirm(false)} className="h-9 px-4 rounded-md text-[13px] font-medium" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>取消</button>
              <button onClick={startPublish} className="h-9 px-4 rounded-md text-[13px] font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>确认发布</button>
            </div>
          </div>
        </div>
      )}
      {hoveredImg && (
        <div className="fixed z-[100] pointer-events-none" style={{ left: hoverPos.x, top: hoverPos.y }}>
          <img src={hoveredImg} alt="" className="w-[400px] h-[400px] rounded-lg object-cover shadow-xl border"
            style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }} />
        </div>
      )}
    </PageContainer>
  )
}

/* ================================================================
   PublishTerminal — fixed-height card, CSS mask, status icons, 3D progress bar
   ================================================================ */

function PublishTerminal({ active, logs, progress, status }: {
  active: boolean; logs: LogEntry[]; progress: number; status: string
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动追底：每次新日志到来，锁定 scrollHeight
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  // ── 主题 tokens ────────────────────────────────────────────────────────
  const bg = isDark ? '#0a0a0a' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'
  const logDone = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.45)'
  const logActive = isDark ? '#e2e8f0' : '#1e293b'
  const activeBg = isDark ? 'rgba(79,70,229,0.1)' : 'rgba(79,70,229,0.06)'
  const activeBorder = isDark ? 'rgba(79,70,229,0.25)' : 'rgba(79,70,229,0.2)'
  const prefixColor = '#4f46e5'
  const errorColor = '#F87171'
  const headerText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)'

  return (
    <div className="relative h-[550px] rounded-2xl overflow-hidden">
      {/* ── 3D 玻璃边框 (浅色) / 暗色边框 ─────────────────────────────────── */}
      {!isDark && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-white/10 rounded-2xl z-0" />
          <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] rounded-2xl z-0" />
        </>
      )}
      {isDark && (
        <div className="absolute inset-0 rounded-2xl z-0" style={{ border: `1px solid ${border}` }} />
      )}

      {/* ── 内容主体 ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col h-full rounded-2xl overflow-hidden z-10"
        style={{
          backgroundColor: isDark ? bg : 'rgba(255,255,255,0.9)',
          backdropFilter: isDark ? 'none' : 'blur(24px)',
          border: isDark ? `1px solid ${border}` : '1px solid rgba(15,23,42,0.06)',
        }}>

        {/* ── 背景氛围光 ──────────────────────────────────────────────────── */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-3xl z-0 pointer-events-none"
          style={{ backgroundColor: isDark ? 'rgba(6,182,212,0.04)' : 'rgba(6,182,212,0.06)' }} />
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-2xl z-0 pointer-events-none"
          style={{ backgroundColor: isDark ? 'rgba(139,92,246,0.03)' : 'rgba(139,92,246,0.04)' }} />

        {/* ── 头部 ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b z-10"
          style={{ borderColor: border }}>
          <span className="text-[11.5px] font-semibold tracking-[0.12em] uppercase"
            style={{ color: headerText }}>任务进度</span>
          {active && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider"
              style={{ color: status === 'FAILED' ? errorColor : '#10b981' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: status === 'FAILED' ? errorColor : '#34d399' }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: status === 'FAILED' ? errorColor : '#10b981' }} />
              </span>
              {status === 'FAILED' ? 'FAILED' : status === 'COMPLETE' ? 'SUCCESS' : 'RUNNING'}
            </div>
          )}
        </div>

        {/* ── 日志区：定高锁死 + CSS Mask 渐隐 + 内部滚动 ──────────────────── */}
        <div className="flex-1 min-h-0 relative z-10"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 100%)',
          }}>
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto font-mono text-xs px-5 py-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: `${border} transparent` }}>
            <div className="space-y-3 pb-2">
              {!active && logs.length === 0 ? (
                <div style={{ color: logDone }}>暂无发布日志</div>
              ) : active && logs.length === 0 ? (
                <div style={{ color: logDone }}>等待 Agent 连接...</div>
              ) : (
                logs.map((log, i) => {
                  const isActive = log.status === 'active'
                  const isError = log.nodeId === 'ERROR'
                  const isSystem = log.nodeId === 'SYSTEM'

                  return (
                    <div key={i}
                      className="flex items-start gap-3 transition-all duration-300"
                      style={{ opacity: isActive ? 1 : 0.5 }}>
                      {isActive ? (
                        <>
                          {/* ── 活动行：前缀+消息共用背景框 ────────────────── */}
                          <div className="flex-1 flex items-start gap-2.5 rounded-md px-2.5 py-1.5 shadow-sm"
                            style={{
                              backgroundColor: activeBg,
                              border: `1px solid ${activeBorder}`,
                            }}>
                            <span className="shrink-0 text-[11px] font-semibold"
                              style={{ color: prefixColor }}>
                              [{log.nodeId}]
                            </span>
                            <span className="flex-1 leading-relaxed font-medium text-[11px]"
                              style={{ color: logActive }}>
                              {log.message}
                            </span>
                          </div>
                          {/* ── 状态图标 ────────────────────────────────────── */}
                          <div className="shrink-0 w-4 flex items-start pt-1.5">
                            {progress >= 100 ? (
                              <CheckCircle2 size={13} className="text-emerald-500/70" strokeWidth={2.5} />
                            ) : (
                              <Loader2 size={13} className="animate-spin" strokeWidth={3} style={{ color: prefixColor }} />
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* ── 非活动行：普通布局 ──────────────────────────── */}
                          <div className="w-[68px] shrink-0 font-medium text-right">
                            <span className="text-[11px] font-normal"
                              style={{ color: isError ? errorColor : isSystem ? '#94A3B8' : 'rgba(148,163,184,0.55)' }}>
                              [{log.nodeId}]
                            </span>
                          </div>
                          <div className="flex-1 leading-relaxed"
                            style={{ color: isError ? errorColor : logDone }}>
                            {log.message}
                          </div>
                          <div className="shrink-0 w-4 flex items-start pt-0.5">
                            {log.status === 'done' && (
                              <CheckCircle2 size={13} className="text-emerald-500/70" strokeWidth={2.5} />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
              {/* 闪烁光标 */}
              {active && progress < 100 && status !== 'FAILED' && (
                <span className="inline-block w-1.5 h-3 align-middle ml-[82px]"
                  style={{ backgroundColor: prefixColor }} />
              )}
            </div>
          </div>
        </div>

        {/* ── 3D 进度条底部 ───────────────────────────────────────────────── */}
        {active && (
          <div className="shrink-0 px-5 pt-1 pb-4 z-10">
            <div className="flex justify-end items-baseline mb-1">
              <span className="text-6xl font-light tracking-tighter tabular-nums leading-none"
                style={{
                  background: isDark
                    ? 'linear-gradient(to bottom right, #e2e8f0, #94a3b8)'
                    : 'linear-gradient(to bottom right, #06b6d4, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 1px 2px rgba(6,182,212,0.2))',
                }}>
                {progress}
              </span>
              <span className="text-3xl font-light mb-1.5 ml-1"
                style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(6,182,212,0.3)' }}>%</span>
            </div>

            {/* 3D 进度条轨道 */}
            <div className="h-2.5 w-full rounded-full overflow-hidden relative p-[1px]"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-surface)',
                boxShadow: isDark ? 'inset 0 1px 3px rgba(0,0,0,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.06)',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.06)',
              }}>
              <div className="h-full rounded-full overflow-hidden relative transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: status === 'FAILED'
                    ? 'linear-gradient(to right, #F87171, #EF4444)'
                    : 'linear-gradient(to right, #06b6d4, #3b82f6)',
                  boxShadow: status === 'FAILED'
                    ? '0 1px 2px rgba(248,113,113,0.3)'
                    : '0 1px 2px rgba(6,182,212,0.3)',
                }}>
                {/* 光泽高光 */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full" />
                {/* 斜纹动画 */}
                <div className="absolute inset-0 opacity-20 stripe-animated" />
              </div>
            </div>

            <div className="flex justify-between items-center mt-2.5 px-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)' }}>
              <span className="flex items-center gap-1">
                <Sparkles size={10} style={{ color: prefixColor }} />
                {status === 'FAILED' ? 'Publish Failed' : 'Publishing'}
              </span>
              <span>{progress >= 100 ? 'Complete' : 'Processing...'}</span>
            </div>
          </div>
        )}

        {/* ── 非活跃态底部占位 ────────────────────────────────────────────── */}
        {!active && (
          <div className="shrink-0 px-5 pb-4 z-10">
            <div className="flex justify-end">
              <span className="text-6xl font-light tracking-tighter leading-none"
                style={{ color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}>--</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 全局样式：斜纹动画 + 滚动条 ───────────────────────────────────── */}
      <style>{`
        .stripe-animated {
          background-image: linear-gradient(
            45deg,
            rgba(255,255,255,0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255,255,255,0.15) 50%,
            rgba(255,255,255,0.15) 75%,
            transparent 75%,
            transparent
          );
          background-size: 1rem 1rem;
          animation: stripe-slide 1s linear infinite;
        }
        @keyframes stripe-slide {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
      `}</style>
    </div>
  )
}
