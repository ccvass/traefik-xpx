import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/api'
import {
  LayoutDashboard, Globe, Shield, Cpu, Zap, Package, Settings,
  Network, BarChart3, MonitorDot, ChevronLeft, ChevronRight, Bot, Wrench, Menu, LogOut, Users
} from 'lucide-react'

interface NavItem { label: string; path: string; icon: ReactNode }
interface NavGroup { title: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { title: '', items: [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
  ]},
  { title: 'Proxy', items: [
    { label: 'HTTP', path: '/proxy/http', icon: <Globe size={18} /> },
    { label: 'TCP', path: '/proxy/tcp', icon: <Network size={18} /> },
    { label: 'UDP', path: '/proxy/udp', icon: <Network size={18} /> },
  ]},
  { title: 'Platform', items: [
    { label: 'AI Gateway', path: '/ai', icon: <Bot size={18} /> },
    { label: 'MCP Gateway', path: '/mcp', icon: <Wrench size={18} /> },
    { label: 'Security', path: '/security', icon: <Shield size={18} /> },
    { label: 'Distributed', path: '/distributed', icon: <Zap size={18} /> },
    { label: 'API Management', path: '/api-mgmt', icon: <Package size={18} /> },
  ]},
  { title: 'Operations', items: [
    { label: 'Multi-Cluster', path: '/clusters', icon: <MonitorDot size={18} /> },
    { label: 'Grafana', path: '/grafana', icon: <BarChart3 size={18} /> },
    { label: 'Users', path: '/users', icon: <Users size={18} /> },
  ]},
]

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname } = useLocation()
  const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
  return (
    <Link
      to={item.path}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        active ? 'bg-brand/10 text-brand font-semibold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      {item.icon}
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static z-50 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-zinc-800">
          <Cpu size={24} className="text-brand shrink-0" />
          {!collapsed && <span className="font-bold text-sm tracking-tight">Traefik-XP</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
          {NAV.map((group) => (
            <div key={group.title || 'top'}>
              {group.title && !collapsed && (
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{group.title}</p>
              )}
              {group.title && collapsed && <div className="border-t border-zinc-800 my-2" />}
              <div className="space-y-0.5">
                {group.items.map((item) => <NavLink key={item.path} item={item} collapsed={collapsed} />)}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button className="lg:hidden text-zinc-400" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div />
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{localStorage.getItem('user') || 'admin'}</span>
            <button onClick={logout} className="flex items-center gap-1 px-2 py-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/50 transition-colors text-xs" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
