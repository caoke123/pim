import { useState } from 'react'
import PageContainer from '@/components/PageContainer'
import { logs } from '@/mock'
import { tasks } from '@/mock'

const levelStyle: Record<string, { dot: string; bg: string; label: string }> = {
  success: { dot: '#34C78A', bg: 'rgba(52,199,138,0.1)', label: '成功' },
  info: { dot: '#635BFF', bg: 'rgba(99,91,255,0.1)', label: '信息' },
  warning: { dot: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: '警告' },
  error: { dot: '#F87171', bg: 'rgba(248,113,113,0.1)', label: '错误' },
}

const taskStatus: Record<string, { label: string; c: string }> = {
  pending: { label: '排队中', c: '#5C5D6E' },
  running: { label: '执行中', c: '#F59E0B' },
  success: { label: '已完成', c: '#34C78A' },
  failed:  { label: '失败',   c: '#F87171' },
}

export default function Logs() {
  const [tab, setTab] = useState<'operation' | 'publish'>('operation')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

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
          { key: 'operation' as const, label: '操作日志', count: logs.length },
          { key: 'publish' as const, label: '发布日志', count: tasks.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all"
            style={{ backgroundColor: tab === t.key ? 'var(--bg-elevated)' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === 'operation' ? (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          {logs.map((l, i) => {
            const s = levelStyle[l.level]
            return (
              <div key={l.id} className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium mt-0.5 shrink-0" style={{ backgroundColor: s.bg, color: s.dot }}>{s.label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{l.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {l.spuCode && <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{l.spuCode}</span>}
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{l.operator}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>{l.time}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          {tasks.map((t, i) => {
            const s = taskStatus[t.status]
            return (
              <div key={t.id}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{ borderBottom: i < tasks.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                  onClick={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.c }} />
                  <div className="flex-1">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{t.platform} · {t.spuName}</span>
                    <span className="text-[10px] ml-2 font-mono" style={{ color: 'var(--text-tertiary)' }}>{t.spuCode}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: s.c, backgroundColor: `${s.c}15` }}>{s.label}</span>
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{t.startedAt}</span>
                </div>
                {expandedTask === t.id && t.logs.length > 0 && (
                  <div className="px-4 py-3 font-mono text-[10px] leading-relaxed" style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border-default)' }}>
                    {t.logs.map((l, j) => (
                      <div key={j} style={{ color: 'var(--text-secondary)' }}>{l.time}  {l.message}</div>
                    ))}
                    {t.errorInfo && <div className="mt-2" style={{ color: '#F87171' }}>{t.errorInfo}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}
