import { Moon, Sun } from 'lucide-react'

interface ThemeToggleProps {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="h-8 flex items-center gap-1.5 px-3 rounded-md transition-colors duration-200 text-[13px]"
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-default)',
      }}
    >
      {theme === 'light' ? (
        <>
          <Moon className="w-3.5 h-3.5" />
          <span>深色</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5" />
          <span>浅色</span>
        </>
      )}
    </button>
  )
}
