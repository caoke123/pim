import { useState } from 'react'
import { Play } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import { useTheme } from '@/hooks/useTheme'
import { products } from '@/mock'

const platforms = [{ name: 'Shopee', active: true, port: 13000 }, { name: 'TikTok', active: false }, { name: 'Temu', active: false }]

const historyTasks = [
  { id: 'T-001', name: '手链套装 · Shopee', status: 'success' as const },
  { id: 'T-002', name: '珍珠耳环 · TikTok', status: 'failed' as const },
  { id: 'T-003', name: '串珠项链 · Shopee', status: 'running' as const },
  { id: 'T-004', name: '发夹三件套 · Lazada', status: 'success' as const },
]

const statusBadge: Record<string, { label: string; bg: string; dot: string }> = {
  success: { label: '成功', bg: 'rgba(52,199,138,0.1)', dot: '#34C78A' },
  failed: { label: '失败', bg: 'rgba(248,113,113,0.1)', dot: '#F87171' },
  running: { label: '进行中', bg: 'rgba(34,211,238,0.1)', dot: '#22d3ee' },
}

const TERMINAL_LOGS = [
  '[0x7F3A] Initializing Playwright browser context',
  '[0x7F3A] Connecting CDP → ws://127.0.0.1:3001',
  '[0x8B21] Browser session acquired',
  '[0x8B21] Navigating to Shopee Seller Center',
  '[0x9C45] Page loaded — ready for input',
  '[0x9C45] Filling product metadata',
  '[0xAD72] Uploading assets (9 files)',
  '[0xAD72] Asset 3/9 uploaded',
  '[0xAD72] Asset 6/9 uploaded',
  '[0xAD72] Asset 9/9 complete',
  '[0xB8E1] Configuring variations',
  '[0xB8E1] Submitting listing',
  '[0xC4F3] Awaiting confirmation',
]

export default function PublishCenter() {
  const { theme } = useTheme()
  const [selectedPlatform, setSelectedPlatform] = useState('Shopee')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [terminal, setTerminal] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [progress, setProgress] = useState(0)

  const toggleProduct = (spu: string) => setSelectedProducts(prev => {
    const n = new Set(prev); n.has(spu) ? n.delete(spu) : n.add(spu); return n
  })

  const startPublish = () => {
    setShowConfirm(false)
    setTerminal(true)
    setTerminalLogs([])
    setProgress(0)
    let i = 0
    const interval = setInterval(() => {
      if (i >= TERMINAL_LOGS.length) { clearInterval(interval); return }
      setTerminalLogs(prev => [...prev, TERMINAL_LOGS[i]])
      setProgress(Math.round(((i + 1) / TERMINAL_LOGS.length) * 100))
      i++
    }, 250)
  }

  return (
    <PageContainer>
      <h1 className="text-[24px] font-medium tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>发布中心</h1>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-tertiary)' }}>选品 → 触发发布 → 查看任务状态</p>

      <div className="flex gap-6" style={{ alignItems: 'stretch' }}>
        {/* ============== LEFT COLUMN ============== */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Platform Selection */}
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

          {/* Product Selection — fills remaining space */}
          <div className="flex-1 flex flex-col mt-6">
            <span className="text-[13px] tracking-wide block mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>选择产品</span>
            <div className="flex-1 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
              <div className="h-full overflow-y-auto">
                {products.slice(0, 8).map(p => (
                  <div key={p.spuCode}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: selectedProducts.has(p.spuCode) ? 'var(--bg-subtle)' : 'transparent' }}
                    onClick={() => toggleProduct(p.spuCode)}
                    onMouseEnter={e => { if (!selectedProducts.has(p.spuCode)) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface)' }}
                    onMouseLeave={e => { if (!selectedProducts.has(p.spuCode)) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                    <input type="checkbox" checked={selectedProducts.has(p.spuCode)} onChange={() => {}} className="w-4 h-4 rounded" style={{ accentColor: 'var(--accent)' }} />
                    <img src={p.mainImage} alt="" className="w-9 h-9 rounded object-cover" />
                    <div className="flex-1">
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.spuName}</p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{p.spuCode} · {p.skuCount} SKU</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Footer — pinned to bottom of left column */}
            <div className="flex items-center justify-between pt-3 mt-auto">
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>已选 {selectedProducts.size} 个产品</span>
              <button onClick={() => setShowConfirm(true)} disabled={selectedProducts.size === 0}
                className="flex items-center gap-1.5 h-9 px-5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
                <Play className="w-3.5 h-3.5" />开始发布
              </button>
            </div>
          </div>
        </div>

        {/* ============== RIGHT COLUMN ============== */}
        <div className="w-[340px] shrink-0 flex flex-col gap-4">
          {/* Terminal — dual-theme, grid pattern, Horizon axis, glow dot */}
          <PublishTerminal
            active={terminal}
            logs={terminalLogs}
            progress={progress}
          />

          {/* History Tasks */}
          <div>
            <span className="text-[12px] font-medium block mb-2" style={{ color: 'var(--text-tertiary)' }}>最近任务</span>
            <div className="rounded-lg overflow-hidden" style={{
              border: '1px solid var(--border-default)',
              ...(theme === 'light' && { backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 20px 50px rgba(15,23,42,0.06)' }),
            }}>
              {historyTasks.map((t, i) => {
                const s = statusBadge[t.status]
                return (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2.5 transition-colors"
                    style={{ borderBottom: i < historyTasks.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                    <span className="text-[12px] truncate mr-2" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium shrink-0"
                      style={{ backgroundColor: s.bg, color: s.dot }}>
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: s.dot }} />{s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--overlay)' }}>
          <div className="rounded-xl p-6 max-w-[400px] w-full" style={{ backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>确认发布</h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>目标平台：{selectedPlatform}<br />选中产品：{selectedProducts.size} 个</p>
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
   PublishTerminal — dual-theme, grid pattern, Horizon axis, glow
   ================================================================ */

function PublishTerminal({ active, logs, progress }: {
  active: boolean; logs: string[]; progress: number
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const t = {
    bg: isDark ? '#030303' : '#f4f7fb',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)',
    headerText: '#06b6d4',
    logColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.55)',
    prefixColor: '#06b6d4',
    numberGradientStart: isDark ? '#ffffff' : '#0f172a',
    numberGradientEnd: isDark ? '#444' : '#64748b',
    bgRadial: isDark
      ? 'radial-gradient(circle at top left, rgba(139,92,246,0.08), transparent 30%)'
      : 'radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 35%), radial-gradient(circle at bottom right, rgba(139,92,246,0.08), transparent 35%)',
    gridColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)',
  }

  return (
    <div
      className="flex-1 rounded-lg overflow-hidden flex flex-col relative"
      style={{ backgroundColor: t.bg, border: `1px solid ${t.border}` }}
    >
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: t.bgRadial }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-60" style={{
        backgroundImage: `linear-gradient(${t.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-4 h-9" style={{ borderBottom: `1px solid ${t.border}` }}>
          <span className="text-[10px] font-mono font-medium tracking-wider" style={{ color: t.headerText }}>PUBLISH TERMINAL</span>
          {active && (
            <span className="text-[9px] font-mono" style={{ color: t.headerText }}>
              {progress >= 100 ? 'COMPLETE' : 'RUNNING'}
            </span>
          )}
        </div>

        {/* Log stream with mask fade */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[10px] leading-relaxed"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: `${t.border} transparent`,
            maskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 100%)',
          }}
        >
          {logs.map((log, i) => {
            const parts = log.match(/^(\[0x[0-9A-F]+\])\s(.+)$/)
            return (
              <div key={i} style={{ color: t.logColor, animation: `fadeUp 0.35s ease-out ${i * 0.02}s both` }}>
                {parts ? (
                  <><span style={{ color: t.prefixColor }}>{parts[1]}</span> {parts[2]}</>
                ) : log}
              </div>
            )
          })}
          {active && progress < 100 && (
            <span className="inline-block w-1.5 h-3 ml-0.5 align-middle" style={{ backgroundColor: t.headerText }} />
          )}
        </div>

        {/* Progress number */}
        <div className="shrink-0 px-4 pb-4 text-right">
          <span className="select-none leading-none" style={{
            fontSize: 64, fontWeight: 200, letterSpacing: -3,
            background: `linear-gradient(180deg, ${t.numberGradientStart} 20%, ${t.numberGradientEnd} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {active ? progress : '--'}
          </span>
        </div>
      </div>

      {/* Inject keyframe for log fadeUp */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
