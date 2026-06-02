import { useState } from 'react'
import { Key, HardDrive, Radio, Eye, EyeOff, Check, X } from 'lucide-react'
import PageContainer from '@/components/PageContainer'

const tabs = [
  { key: 'api' as const, icon: Key, label: 'API 配置' },
  { key: 'r2' as const, icon: HardDrive, label: 'R2 存储配置' },
  { key: 'platform' as const, icon: Radio, label: '发布平台配置' },
]

const platformConfig = [
  { name: 'Shopee', address: '127.0.0.1:13000', active: true },
  { name: 'Temu', address: '', active: false },
  { name: 'TikTok', address: '', active: false },
]

export default function Settings() {
  const [tab, setTab] = useState<'api' | 'r2' | 'platform'>('api')
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <PageContainer>
      <h1 className="text-[28px] font-semibold tracking-tight text-gray-900 mb-1">系统设置</h1>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-tertiary)' }}>API Key、R2 配置、发布平台配置</p>

      <div className="flex gap-6">
        <div className="w-[200px] shrink-0 space-y-0.5">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors"
              style={{ color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)', backgroundColor: tab === t.key ? 'var(--bg-subtle)' : 'transparent' }}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-[560px]">
          {tab === 'api' && (
            <div className="space-y-4 rounded-lg p-5" style={{ border: '1px solid var(--border-default)' }}>
              <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>豆包 API 配置</h3>
              <Field label="豆包 API Key" secret showToggle onToggle={() => setShowApiKey(!showApiKey)} showSecret={showApiKey} />
              <Field label="豆包 模型 ID" value="doubao-pro-32k" />
              <button className="h-9 px-4 rounded-md text-[13px] font-medium flex items-center gap-1.5 transition-colors" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                <Check className="w-3.5 h-3.5" />测试连接
              </button>
            </div>
          )}

          {tab === 'r2' && (
            <div className="space-y-4 rounded-lg p-5" style={{ border: '1px solid var(--border-default)' }}>
              <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Cloudflare R2 配置</h3>
              <Field label="Account ID" value="abc123..." />
              <Field label="Bucket Name" value="yuntu-pim-assets" />
              <Field label="Access Key ID" secret />
              <Field label="Secret Access Key" secret />
              <Field label="自定义域名" value="https://assets.yuntu.com" />
              <button className="h-9 px-4 rounded-md text-[13px] font-medium flex items-center gap-1.5 transition-colors" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                <Check className="w-3.5 h-3.5" />测试连接
              </button>
            </div>
          )}

          {tab === 'platform' && (
            <div className="space-y-3 rounded-lg p-5" style={{ border: '1px solid var(--border-default)' }}>
              <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>发布平台配置</h3>
              {platformConfig.map(p => (
                <div key={p.name} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{p.address || '未配置'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium`} style={{ backgroundColor: p.active ? 'var(--success-bg)' : 'var(--border-default)', color: p.active ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {p.active ? '已激活' : '未激活'}
                    </span>
                    <button className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>{p.active ? '停用' : '添加配置'}</button>
                  </div>
                </div>
              ))}
              <button className="mt-3 text-[12px] font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}>+ 添加新平台</button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

function Field({ label, value, secret, showToggle, onToggle, showSecret }: { label: string; value?: string; secret?: boolean; showToggle?: boolean; onToggle?: () => void; showSecret?: boolean }) {
  return (
    <div>
      <span className="text-[11px] block mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="relative">
        <input type={secret && !showSecret ? 'password' : 'text'} defaultValue={value} readOnly={!!value}
          className="w-full h-9 px-3 pr-10 rounded-md text-[13px] outline-none font-mono"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' }} />
        {showToggle && (
          <button onClick={onToggle} className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {showSecret ? <EyeOff className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /> : <Eye className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />}
          </button>
        )}
      </div>
    </div>
  )
}
