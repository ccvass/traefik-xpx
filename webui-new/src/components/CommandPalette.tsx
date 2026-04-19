import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { Globe, Bot, Wrench, Shield, Zap, Package, MonitorDot, BarChart3, Users, FileText, Heart, Settings } from 'lucide-react'

const PAGES = [
  { name: 'Dashboard', path: '/', icon: Globe },
  { name: 'API Gateway', path: '/gateway', icon: Globe },
  { name: 'AI Gateway', path: '/ai', icon: Bot },
  { name: 'MCP Gateway', path: '/mcp', icon: Wrench },
  { name: 'Security', path: '/security', icon: Shield },
  { name: 'Distributed', path: '/distributed', icon: Zap },
  { name: 'API Management', path: '/api-mgmt', icon: Package },
  { name: 'Multi-Cluster', path: '/clusters', icon: MonitorDot },
  { name: 'Grafana Dashboards', path: '/grafana', icon: BarChart3 },
  { name: 'Users', path: '/users', icon: Users },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Logs', path: '/logs', icon: FileText },
  { name: 'Metrics', path: '/metrics', icon: BarChart3 },
  { name: 'Health', path: '/health', icon: Heart },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <Command className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          <Command.Input placeholder="Search pages..." className="w-full px-4 py-3 bg-transparent text-white text-sm outline-none border-b border-zinc-800 placeholder:text-zinc-500" />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="p-4 text-sm text-zinc-500 text-center">No results</Command.Empty>
            {PAGES.map(p => (
              <Command.Item key={p.path} value={p.name} onSelect={() => { navigate(p.path); setOpen(false) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 cursor-pointer data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white">
                <p.icon size={16} className="text-zinc-500" />
                {p.name}
              </Command.Item>
            ))}
          </Command.List>
          <div className="border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-600">
            Navigate with arrows • Enter to select • Esc to close
          </div>
        </Command>
      </div>
    </div>
  )
}
