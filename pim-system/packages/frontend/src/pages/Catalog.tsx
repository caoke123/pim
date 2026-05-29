import { useState } from 'react'
import { Plus, Copy, Link2, Lock, Trash2, ExternalLink } from 'lucide-react'
import PageContainer from '@/components/PageContainer'

interface Catalog { id: string; name: string; productCount: number; hasPassword: boolean; isActive: boolean; createdAt: string }

const mockCatalogs: Catalog[] = [
  { id: 'a8f3-4b2c', name: '2026 春夏新品', productCount: 24, hasPassword: false, isActive: true, createdAt: '2026-05-20' },
  { id: 'd2e1-7c4a', name: 'VIP 客户精选', productCount: 12, hasPassword: true, isActive: true, createdAt: '2026-05-15' },
  { id: 'f5b9-1a3d', name: '批发价目表', productCount: 48, hasPassword: true, isActive: false, createdAt: '2026-05-10' },
]

export default function Catalog() {
  const [showModal, setShowModal] = useState(false)
  const [catalogs] = useState(mockCatalogs)

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-medium tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>产品图册</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>对外分享门户，向买家或分销商展示产品</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>
          <Plus className="w-3.5 h-3.5" />新建图册
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogs.map(c => (
          <div key={c.id} className="rounded-lg p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${c.isActive ? '' : 'opacity-50'}`}
                style={{ backgroundColor: c.isActive ? 'var(--success-bg)' : 'var(--border-default)', color: c.isActive ? 'var(--success)' : 'var(--text-tertiary)' }}>
                {c.isActive ? '启用' : '已停用'}
              </span>
            </div>
            <div className="space-y-1.5 mb-4">
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{c.productCount} 个产品</p>
              <p className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>/{c.id}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>创建于 {c.createdAt}{c.hasPassword ? ' · 有密码保护' : ''}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onClick={() => navigator.clipboard.writeText(`https://pim.yuntu.com/c/${c.id}`)}>
                <Copy className="w-3 h-3" />复制链接
              </button>
              <button className="flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                <Lock className="w-3 h-3" />密码
              </button>
              <button className="flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium transition-colors"
                style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid transparent' }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="rounded-xl p-6 max-w-[420px] w-full" style={{ backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>新建产品图册</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] block mb-1" style={{ color: 'var(--text-tertiary)' }}>图册名称</span>
                <input className="w-full h-9 px-3 rounded-md text-[13px] outline-none" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' }} placeholder="例如：春夏新品" />
              </div>
              <div>
                <span className="text-[11px] block mb-1" style={{ color: 'var(--text-tertiary)' }}>访问密码（可选）</span>
                <input type="password" className="w-full h-9 px-3 rounded-md text-[13px] outline-none" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' }} placeholder="留空则不设密码" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-md text-[13px] font-medium" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>取消</button>
              <button className="h-9 px-4 rounded-md text-[13px] font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>创建</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

function BookOpen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
