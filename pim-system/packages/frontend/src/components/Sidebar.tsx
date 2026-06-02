import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Radio, BookOpen, ScrollText, Settings, Users } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

interface SidebarProps { theme: 'light' | 'dark'; onToggleTheme: () => void }

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '概览' },
  { to: '/products', icon: Package, label: '产品库' },
  { to: '/publish', icon: Radio, label: '发布中心' },
  { to: '/catalog', icon: BookOpen, label: '产品图册' },
  { to: '/distributions', icon: Users, label: '分销管理' },
  { to: '/logs', icon: ScrollText, label: '日志中心' },
  { to: '/settings', icon: Settings, label: '系统设置' },
]

export default function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  const location = useLocation()

  return (
    <aside className="w-[240px] h-full flex flex-col shrink-0 fixed left-0 top-0 select-none"
      style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
      <div className="h-14 flex items-center px-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>雨图饰品 PIM</span>
        <span className="ml-2 text-[12px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--sidebar-text)', backgroundColor: 'var(--sidebar-border)' }}>v1.0</span>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavItem key={item.to} {...item} currentPath={location.pathname} />
        ))}
      </nav>

      <div className="h-14 flex items-center justify-between px-4" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>YT</div>
          <div>
            <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>运营</p>
            <p className="text-[12px]" style={{ color: 'var(--sidebar-text)' }}>管理员</p>
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </aside>
  )
}

function NavItem({ to, icon: Icon, label, currentPath }: { to: string; icon: React.ElementType; label: string; currentPath: string }) {
  const isActive = to === '/' ? currentPath === '/' : currentPath.startsWith(to)
  return (
    <NavLink to={to} end={to === '/'}
      className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-colors duration-150 mx-1.5 group"
      style={isActive ? { backgroundColor: 'var(--sidebar-active-bg)', color: 'var(--accent)', borderLeft: '2px solid var(--accent)', paddingLeft: '10px' } : { color: 'var(--sidebar-text)' }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text-hover)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)' }}>
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
      <span className="text-[13px] font-medium">{label}</span>
    </NavLink>
  )
}
