import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Loader2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import { useTheme } from '@/hooks/useTheme'
import { api } from '@/api/client'
import type { ProductListItem } from '@/api/types'

const API_BASE = 'http://localhost:8000/api/v1'

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

export default function PublishCenter() {
  const { theme } = useTheme()
  const [products, setProducts] = useState<PublishProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState('Shopee')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [terminal, setTerminal] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [terminalStatus, setTerminalStatus] = useState<string>('')
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([])
  const [publishing, setPublishing] = useState(false)
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
    const logs: string[] = []
    if (task.logLines && Array.isArray(task.logLines)) {
      for (const l of task.logLines) {
        logs.push(`${l.nodeId || ''} ${l.message || ''}`)
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
                setTerminalLogs(prev => [...prev, `${parsed.nodeId} ${parsed.message}`])
              }
              if (typeof parsed.progress === 'number') setProgress(parsed.progress)
              if (parsed.status) {
                setTerminalStatus(parsed.status.toUpperCase())
                if (parsed.status === 'failed' && parsed.error) {
                  setTerminalLogs(prev => [...prev, `[ERROR] ${parsed.error}`])
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
        setTerminalLogs([`[ERROR] 创建任务失败: ${createData.message}`])
        setTerminalStatus('FAILED')
        setPublishing(false)
        return
      }

      const task = createData.data
      setTerminalLogs([`[SYSTEM] 任务 ${task.id.slice(0, 8)}... 已创建, 平台: ${task.platform}`])

      // 如果 Agent 未运行
      if (task.status === 'failed') {
        const errMsg = task.error || '本地发布Agent未运行'
        setTerminalLogs(prev => [...prev, `[ERROR] ${errMsg}，请启动分拣系统`])
        setTerminalStatus('FAILED')
        setPublishing(false)
        loadHistory()
        return
      }

      // 2. 连接 SSE
      setTerminalLogs(prev => [...prev, '[SYSTEM] 正在连接 Agent...'])
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
                // 日志行
                setTerminalLogs(prev => [...prev, `${parsed.nodeId} ${parsed.message}`])
              }
              if (typeof parsed.progress === 'number') {
                setProgress(parsed.progress)
              }
              if (parsed.status) {
                setTerminalStatus(parsed.status.toUpperCase())
                if (parsed.status === 'failed' && parsed.error) {
                  setTerminalLogs(prev => [...prev, `[ERROR] ${parsed.error}`])
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
        setTerminalLogs(prev => [...prev, `[ERROR] 连接中断: ${err.message}`])
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
      <h1 className="text-[24px] font-medium tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>发布中心</h1>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-tertiary)' }}>选品 → 触发发布 → 查看任务状态</p>

      <div className="flex gap-6" style={{ alignItems: 'stretch' }}>
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div>
            <span className="text-[13px] tracking-wide block mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>选择平台</span>
            <div className="flex gap-3">
              {platforms.map(p => (
                <button key={p.name} onClick={() => p.active && setSelectedPlatform(p.name)}
                  className={`rounded-lg px-5 py-3 text-left transition-all duration-200 ${p.active ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                  style={{ backgroundColor: selectedPlatform === p.name && p.active ? 'var(--bg-subtle)' : 'var(--bg-elevated)', border: selectedPlatform === p.name && p.active ? '2px solid var(--accent)' : '1px solid var(--border-default)' }}>
                  <p className="text-[14px] font-semibold" style={{ color: p.active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{p.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{p.active ? `端口: ${p.port}` : '未配置'}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col mt-6">
            <span className="text-[13px] tracking-wide block mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>选择产品</span>
            <div className="flex-1 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
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
                      className="text-[11px] underline" style={{ color: 'var(--accent)' }}>重试</button>
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
                        <img src={p.mainImage} alt="" className="w-9 h-9 rounded object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                          <span className="text-[7px]" style={{ color: 'var(--text-tertiary)' }}>无图</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{p.spuCode} · {p.skuCount} SKU</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 mt-auto">
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>已选 {selectedIds.size} 个产品</span>
              <button onClick={() => setShowConfirm(true)} disabled={selectedIds.size === 0 || publishing}
                className="flex items-center gap-1.5 h-9 px-5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                <Play className="w-3.5 h-3.5" />
                {publishing ? '发布中...' : '开始发布'}
              </button>
            </div>
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>最近任务</span>
              <button onClick={loadHistory} className="text-[10px]" style={{ color: 'var(--accent)' }}>刷新</button>
            </div>
            <div className="rounded-lg overflow-hidden" style={{
              border: '1px solid var(--border-default)',
              ...(theme === 'light' && { backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)' }),
            }}>
              {historyTasks.length === 0 ? (
                <div className="py-8 text-center text-[11px]" style={{ color: 'var(--text-tertiary)' }}>暂无发布记录</div>
              ) : (
                historyTasks.map((t, i) => {
                  const s = statusBadge[t.status] || statusBadge.pending
                  return (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2.5 transition-colors"
                      style={{ borderBottom: i < historyTasks.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                      <div className="flex-1 min-w-0 mr-2">
                        <span className="text-[11px] block truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                        <span className="text-[9px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(t.createdAt)}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium shrink-0"
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
    </PageContainer>
  )
}

/* ================================================================
   PublishTerminal — dual-theme, grid pattern, SSE log stream
   ================================================================ */

function PublishTerminal({ active, logs, progress, status }: {
  active: boolean; logs: string[]; progress: number; status: string
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const t = {
    bg: isDark ? '#030303' : '#f4f7fb',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)',
    headerText: '#06b6d4',
    logColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.55)',
    prefixColor: '#06b6d4',
    errorColor: '#F87171',
    numberGradientStart: isDark ? '#ffffff' : '#0f172a',
    numberGradientEnd: isDark ? '#444' : '#64748b',
    bgRadial: isDark
      ? 'radial-gradient(circle at top left, rgba(139,92,246,0.08), transparent 30%)'
      : 'radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 35%), radial-gradient(circle at bottom right, rgba(139,92,246,0.08), transparent 35%)',
    gridColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)',
  }

  return (
    <div className="flex-1 rounded-lg overflow-hidden flex flex-col relative"
      style={{ backgroundColor: t.bg, border: `1px solid ${t.border}`, minHeight: 300 }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: t.bgRadial }} />
      <div className="absolute inset-0 pointer-events-none opacity-60" style={{
        backgroundImage: `linear-gradient(${t.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
      }} />

      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center justify-between shrink-0 px-4 h-9" style={{ borderBottom: `1px solid ${t.border}` }}>
          <span className="text-[10px] font-mono font-medium tracking-wider" style={{ color: t.headerText }}>PUBLISH TERMINAL</span>
          {active && (
            <span className="text-[9px] font-mono" style={{ color: status === 'FAILED' ? t.errorColor : t.headerText }}>
              {status || (progress >= 100 ? 'COMPLETE' : 'RUNNING')}
            </span>
          )}
        </div>

        <div ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[10px] leading-relaxed"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` }}>
          {active && logs.length === 0 ? (
            <div style={{ color: t.logColor }}>等待 Agent 连接...</div>
          ) : logs.map((log, i) => {
            const isError = log.startsWith('[ERROR]')
            const parts = log.match(/^(\[0x[0-9A-F]+\]|\[SYSTEM\]|\[ERROR\])\s?(.*)$/)
            return (
              <div key={i} style={{ color: isError ? t.errorColor : t.logColor, animation: `fadeUp 0.35s ease-out both` }}>
                {parts ? (
                  <><span style={{ color: isError ? t.errorColor : parts[1] === '[SYSTEM]' ? '#94A3B8' : t.prefixColor }}>{parts[1]}</span> {parts[2]}</>
                ) : log}
              </div>
            )
          })}
          {active && progress < 100 && status !== 'FAILED' && (
            <span className="inline-block w-1.5 h-3 ml-0.5 align-middle" style={{ backgroundColor: t.headerText }} />
          )}
        </div>

        {active && (
          <div className="shrink-0 px-4 pb-4 text-right">
            <span className="select-none leading-none font-light" style={{
              fontSize: 48, letterSpacing: -2,
              color: status === 'FAILED' ? t.errorColor : t.headerText,
            }}>
              {progress}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
