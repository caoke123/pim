import { useNavigate } from 'react-router-dom'
import { Search, Package, Clock, ShoppingBag, XCircle } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import PageContainer from '@/components/PageContainer'
import { products } from '@/mock'

const stats = [
  { label: '总产品数', value: 186, trend: '+5 今日新增', icon: Package, color: '#635BFF', path: '/products' },
  { label: '待处理', value: 12, trend: '需处理', icon: Clock, color: '#F59E0B', path: '/products?filter=pending' },
  { label: '待发布', value: 24, trend: '已就绪', icon: ShoppingBag, color: '#34C78A', path: '/products?filter=ready' },
  { label: '发布失败', value: 7, trend: '待重试', icon: XCircle, color: '#F87171', path: '/publish?filter=failed' },
]

const recent = products.slice(0, 5)
const pendingTasks = [
  { spu: 'YXGW260528-0007', task: '补充详情图（缺少 3 张）', pri: '高' },
  { spu: 'YXGW260528-0048', task: 'Shopee 发布失败', pri: '高' },
  { spu: 'YXGW260528-0019', task: '填写售价信息', pri: '中' },
  { spu: 'YXGW260528-0033', task: '审核产品信息', pri: '低' },
]
const activity = [
  { dot: '#34C78A', text: 'YXGW260528-0003 已发布至 Shopee', time: '3分钟前' },
  { dot: '#F59E0B', text: 'YXGW260528-0007 缺少详情图', time: '15分钟前' },
  { dot: '#34C78A', text: 'YXGW260528-0012 图片审核通过', time: '28分钟前' },
  { dot: '#F87171', text: 'YXGW260528-0048 Shopee 发布失败', time: '1小时前' },
  { dot: '#34C78A', text: 'YXGW260528-0015 已发布至 TikTok', time: '2小时前' },
  { dot: '#635BFF', text: '今日同步新增 5 件产品', time: '3小时前' },
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Search */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-[640px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <input
              placeholder="搜索产品名称、SPU、SKU、平台商品ID…"
              className="w-full h-12 pl-11 pr-4 rounded-lg text-[14px] outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-lg p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
              onClick={() => navigate(s.path)}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <span className="text-[13px] tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
              </div>
              <span className="text-[32px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{s.value}</span>
              <p className="text-[12px] mt-1" style={{ color: s.color }}>{s.trend}</p>
            </div>
          ))}
        </div>

        {/* Recent + Pending */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] tracking-wide" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>最近产品</span>
              <button onClick={() => navigate('/products')} className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>查看全部 →</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recent.map(p => (
                <ProductCard key={p.spuCode} imageUrl={p.mainImage} productName={p.spuName} spuCode={p.spuCode} skuCount={p.skuCount} salePrice={p.salePrice} costPrice={p.costPrice} platforms={p.platforms} onDetail={() => navigate('/products')} />
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <span className="text-[13px] tracking-wide block mb-3" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>待处理事项</span>
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              {pendingTasks.map((t, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{ borderBottom: i < pendingTasks.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: t.pri === '高' ? 'var(--danger)' : t.pri === '中' ? 'var(--warning)' : 'var(--text-tertiary)' }} />
                  <div>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{t.spu}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-primary)' }}>{t.task}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity */}
        <div>
          <span className="text-[13px] tracking-wide block mb-3" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>实时动态</span>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: i < activity.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: a.dot }} />
                <span className="flex-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{a.text}</span>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
