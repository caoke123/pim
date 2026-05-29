import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Dashboard from '@/pages/Dashboard'
import Products from '@/pages/Products'
import PublishCenter from '@/pages/PublishCenter'
import Catalog from '@/pages/Catalog'
import Logs from '@/pages/Logs'
import Settings from '@/pages/Settings'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

export default function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar theme={theme} onToggleTheme={toggleTheme} />
          <div className="flex-1 flex flex-col overflow-hidden ml-[240px]">
            <Topbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/publish" element={<PublishCenter />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
