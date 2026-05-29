import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'

interface AgentStatus { online: boolean; machineName: string; cdpConnected: boolean }

export default function Topbar() {
  const location = useLocation()
  const isPublish = location.pathname === '/publish'
  const [agent, setAgent] = useState<AgentStatus>({ online: false, machineName: '', cdpConnected: false })
  const [time, setTime] = useState(new Date())

  const ping = useCallback(async () => {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 2000)
      const res = await fetch('http://127.0.0.1:13000/ping', { signal: ctrl.signal })
      clearTimeout(t)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAgent({ online: data.status === 'ok', machineName: data.machineName || '', cdpConnected: data.easyBrConnected ?? false })
    } catch { setAgent(p => ({ ...p, online: false, cdpConnected: false })) }
  }, [])

  useEffect(() => { ping(); const i = setInterval(ping, 3000); return () => clearInterval(i) }, [ping])
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i) }, [])

  return (
    <header className="h-14 flex items-center justify-between px-5 shrink-0"
      style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
      {/* Left: Search box (publish only) */}
      <div className="flex items-center gap-3">
        {isPublish && (
          <button className="h-8 flex items-center gap-2 px-3 rounded-md text-[12px]"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border-strong)' }}>
            <Search className="w-3.5 h-3.5" />
            搜索产品名称、SPU、SKU、平台商品ID…
          </button>
        )}
      </div>

      {/* Right: Status chips (publish only) + bell + time */}
      <div className="flex items-center gap-3">
        {isPublish && (
          <>
            <StatusChip dotColor={agent.online ? 'var(--success)' : 'var(--text-tertiary)'} label={agent.online ? `在线运行 · ${agent.machineName}` : '离线'} active={agent.online} />
            <div style={{ width: 1, height: 12, backgroundColor: 'var(--border-default)' }} />
            <StatusChip dotColor={agent.cdpConnected ? 'var(--status-live)' : 'var(--text-tertiary)'} label={agent.cdpConnected ? 'Shopee 已连接' : 'Shopee 未连接'} active={agent.cdpConnected} />
            <div style={{ width: 1, height: 12, backgroundColor: 'var(--border-default)' }} />
            <StatusChip dotColor="var(--accent)" label="同步运行中" active={false} />
          </>
        )}
        <Bell className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{time.toLocaleTimeString('zh-CN', { hour12: false })}</span>
      </div>
    </header>
  )
}

function StatusChip({ dotColor, label, active }: { dotColor: string; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={active ? 'status-dot-live' : ''} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor }} />
      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}
