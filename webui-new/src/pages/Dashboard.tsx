import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { fetcher, api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { StatusBadge, TypeBadge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { FlowDiagram } from '@/components/FlowDiagram'
import { Stat } from './shared'
import { COLORS } from '@/lib/design'
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, Search, Lock, ArrowRight,
  Bot, Wrench, Shield, Zap, Package, BarChart3, MonitorDot, Pencil, Trash2, Save, X
} from 'lucide-react'
import type { Overview, Entrypoint, Middleware } from '@/types/api'

function HealthBanner({ overview, entrypoints }: { overview: Overview; entrypoints: Entrypoint[] }) {
  const errors = (overview.http.routers.errors || 0) + (overview.http.services.errors || 0)
  const warnings = (overview.http.routers.warnings || 0) + (overview.http.services.warnings || 0)
  return (
    <div className={cn('glass p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4', errors > 0 ? 'border-red-900/50' : 'border-emerald-900/30')}>
      <div className="flex items-center gap-3">
        {errors > 0 ? <XCircle className="text-red-400" size={24} /> : warnings > 0 ? <AlertTriangle className="text-amber-400" size={24} /> : <CheckCircle2 className="text-emerald-400" size={24} />}
        <div>
          <h2 className="font-bold text-lg">{errors > 0 ? `${errors} errors` : warnings > 0 ? `${warnings} warnings` : 'All systems operational'}</h2>
          <p className="text-sm text-zinc-400">{entrypoints.length} entrypoints • {Object.keys(overview.providers || {}).filter(k => overview.providers[k]).join(', ') || 'no'} provider</p>
        </div>
      </div>
      <div className="flex gap-3">
        {[['Routes', overview.http.routers.total + overview.tcp.routers.total, COLORS.brand],
          ['Services', overview.http.services.total + overview.tcp.services.total, '#a855f7'],
          ['Middlewares', overview.http.middlewares.total, '#10b981'],
          ['Endpoints', entrypoints.length, '#3b82f6']
        ].map(([l, v, c]) => (
          <div key={l as string} className="glass px-3 py-2 min-w-[80px]" style={{ borderTopWidth: 3, borderTopStyle: 'solid', borderTopColor: c as string }}>
            <p className="text-xl font-extrabold">{v as number}</p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{l as string}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResourceTable({ data, type, onSelect, onEdit, onDelete, search }: { data: any[]; type: 'router' | 'service' | 'middleware'; onSelect: (d: any) => void; onEdit: (d: any) => void; onDelete: (d: any) => void; search: string }) {
  const filtered = data.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.rule?.toLowerCase().includes(search.toLowerCase()))
  const [page, setPage] = useState(0)
  const perPage = 20
  const paged = filtered.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
              <th className="pb-3 pr-4">Name</th>
              {type === 'router' && <><th className="pb-3 pr-4">Rule</th><th className="pb-3 pr-4">Service</th><th className="pb-3 pr-4">TLS</th><th className="pb-3 pr-4">Entrypoints</th></>}
              {type === 'service' && <><th className="pb-3 pr-4">Servers</th><th className="pb-3 pr-4">Health Check</th></>}
              {type === 'middleware' && <><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Config</th></>}
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Provider</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((d: any) => (
              <tr key={d.name} onClick={() => onSelect(d)} className="border-t border-zinc-800/50 cursor-pointer hover:bg-white/[0.02] transition-colors">
                <td className="py-3 pr-4 font-medium text-zinc-200">{d.name}</td>
                {type === 'router' && <>
                  <td className="py-3 pr-4 text-xs text-zinc-400 font-mono max-w-[300px] truncate">{d.rule}</td>
                  <td className="py-3 pr-4 text-xs text-zinc-400">{d.service}</td>
                  <td className="py-3 pr-4">{d.tls ? <span style={{ backgroundColor: '#10b98118', color: '#34d399', borderRadius: 9999, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{d.tls.certResolver || 'yes'}</span> : <span className="text-zinc-600">—</span>}</td>
                  <td className="py-3 pr-4"><div className="flex gap-1 flex-wrap">{d.entryPoints?.map((ep: string) => <span key={ep} style={{ backgroundColor: '#3b82f618', color: '#60a5fa', borderRadius: 9999, padding: '1px 6px', fontSize: 10 }}>{ep}</span>)}</div></td>
                </>}
                {type === 'service' && <>
                  <td className="py-3 pr-4 text-xs text-zinc-400">{d.loadBalancer?.servers?.length || 0} server(s)</td>
                  <td className="py-3 pr-4 text-xs text-zinc-400">{d.loadBalancer?.healthCheck?.path || '—'}</td>
                </>}
                {type === 'middleware' && <>
                  <td className="py-3 pr-4"><TypeBadge type={d.type || 'unknown'} /></td>
                  <td className="py-3 pr-4 text-xs text-zinc-500 max-w-[200px] truncate">{d.type}</td>
                </>}
                <td className="py-3 pr-4"><StatusBadge status={d.status} /></td>
                <td className="py-3 text-xs text-zinc-500">{d.provider}</td>
                <td className="py-3 text-right">
                  {d.provider === 'file' && <div className="flex gap-1 justify-end">
                    <button onClick={e => { e.stopPropagation(); onEdit(d) }} className="p-1 rounded hover:bg-amber-950 text-zinc-600 hover:text-amber-400" title="Edit"><Pencil size={13} /></button>
                    <button onClick={e => { e.stopPropagation(); onDelete(d) }} className="p-1 rounded hover:bg-red-950 text-zinc-600 hover:text-red-400" title="Delete"><Trash2 size={13} /></button>
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-zinc-500">
          <span>{filtered.length} items • page {page + 1}/{totalPages}</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)} className="px-2 py-1 rounded" style={i === page ? { backgroundColor: '#2AA2C130', color: '#2AA2C1' } : {}}>{i + 1}</button>
            ))}
          </div>
        </div>
      )}
      {filtered.length === 0 && <p className="text-zinc-600 text-sm py-4">No results{search ? ` for "${search}"` : ''}</p>}
    </div>
  )
}

function DetailModal({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <Modal open={true} onClose={onClose} color="#2AA2C1" size="lg">
      <h3 className="font-semibold text-lg mb-4" style={{ color: '#2AA2C1' }}>{data.name}</h3>
      <div className="space-y-4">
        {data.rule && <div className="glass p-3 relative"><FlowDiagram router={data} /></div>}
        {data.rule && <div><span className="text-xs text-zinc-500">Rule</span><p className="text-sm font-mono mt-1 p-3 rounded-lg" style={{ backgroundColor: '#09090b', color: '#34d399' }}>{data.rule}</p></div>}
        {data.service && <div className="flex gap-8"><div><span className="text-xs text-zinc-500">Service</span><p className="text-sm mt-1">{data.service}</p></div></div>}
        {data.entryPoints && <div><span className="text-xs text-zinc-500">Entry Points</span><div className="flex gap-1 mt-1">{data.entryPoints.map((ep: string) => <span key={ep} style={{ backgroundColor: '#3b82f618', color: '#60a5fa', borderRadius: 9999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{ep}</span>)}</div></div>}
        {data.middlewares?.length > 0 && <div><span className="text-xs text-zinc-500">Middlewares</span><div className="flex gap-1 mt-1 flex-wrap">{data.middlewares.map((m: string) => <span key={m} style={{ backgroundColor: '#f9731618', color: '#fb923c', borderRadius: 9999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{m}</span>)}</div></div>}
        {data.tls && <div><span className="text-xs text-zinc-500">TLS</span><p className="mt-1"><span style={{ backgroundColor: '#10b98118', color: '#34d399', borderRadius: 9999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>Resolver: {data.tls.certResolver || 'manual'}</span></p></div>}
        {data.loadBalancer?.servers && <div><span className="text-xs text-zinc-500">Servers ({data.loadBalancer.servers.length})</span><div className="mt-1 space-y-1">{data.loadBalancer.servers.map((s: any, i: number) => <p key={i} className="text-sm font-mono p-2 rounded-lg" style={{ backgroundColor: '#09090b' }}>{s.url || s.address}</p>)}</div></div>}
        {data.loadBalancer?.healthCheck && <div><span className="text-xs text-zinc-500">Health Check</span><p className="text-sm mt-1">Path: <code>{data.loadBalancer.healthCheck.path}</code> • Interval: {data.loadBalancer.healthCheck.interval}</p></div>}
        {data.type && <div><span className="text-xs text-zinc-500">Type</span><p className="mt-1"><TypeBadge type={data.type} /></p></div>}
        <div className="flex gap-8">
          <div><span className="text-xs text-zinc-500">Status</span><p className="mt-1"><StatusBadge status={data.status} /></p></div>
          <div><span className="text-xs text-zinc-500">Provider</span><p className="mt-1 text-sm">{data.provider}</p></div>
        </div>
        <details><summary className="text-xs text-zinc-500 cursor-pointer">Raw JSON</summary><pre className="text-xs font-mono mt-2 p-3 rounded-lg overflow-auto max-h-60" style={{ backgroundColor: '#09090b', color: '#34d399' }}>{JSON.stringify(data, null, 2)}</pre></details>
      </div>
    </Modal>
  )
}

function QuickLinks() {
  return (
    <div className="flex gap-2 flex-wrap">
      {[
        { label: 'AI Gateway', to: '/ai', icon: <Bot size={12} /> },
        { label: 'MCP Gateway', to: '/mcp', icon: <Wrench size={12} /> },
        { label: 'Security', to: '/security', icon: <Shield size={12} /> },
        { label: 'Distributed', to: '/distributed', icon: <Zap size={12} /> },
        { label: 'API Mgmt', to: '/api-mgmt', icon: <Package size={12} /> },
        { label: 'Clusters', to: '/clusters', icon: <MonitorDot size={12} /> },
        { label: 'Grafana', to: '/grafana', icon: <BarChart3 size={12} /> },
      ].map(a => (
        <Link key={a.label} to={a.to} className="flex items-center gap-1.5 px-2 py-1 glass text-[10px] text-zinc-400 hover:text-white transition-colors">
          {a.icon} {a.label}
        </Link>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { data: overview } = useSWR<Overview>('/overview', fetcher, { refreshInterval: 5000 })
  const { data: entrypoints } = useSWR<Entrypoint[]>('/entrypoints', fetcher)
  const [proto, setProto] = useState('http')
  const { data: routers } = useSWR(`/${proto}/routers`, fetcher)
  const { data: services } = useSWR(`/${proto}/services`, fetcher)
  const { data: middlewares } = useSWR(`/${proto}/middlewares`, fetcher)
  const [detail, setDetail] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'routers' | 'services' | 'middlewares'>('routers')
  const [editing, setEditing] = useState<any>(null)
  const [editJson, setEditJson] = useState('')

  const typeMap = { routers: 'routers', services: 'services', middlewares: 'middlewares' }
  const mutateAll = () => { mutate(`/${proto}/routers`); mutate(`/${proto}/services`); mutate(`/${proto}/middlewares`) }
  const handleEdit = (d: any) => { setEditing(d); setEditJson(JSON.stringify(d, null, 2)) }
  const handleSave = async () => {
    if (!editing) return
    const name = editing.name.replace(/@.*/, '')
    const t = editing.rule ? 'routers' : editing.loadBalancer ? 'services' : 'middlewares'
    await api.put(`/config/${proto}/${t}/${name}`, JSON.parse(editJson))
    mutateAll(); setEditing(null)
  }
  const handleDelete = async (d: any) => {
    if (!confirm(`Delete "${d.name}"?`)) return
    const name = d.name.replace(/@.*/, '')
    const t = d.rule ? 'routers' : d.loadBalancer ? 'services' : 'middlewares'
    await api.del(`/config/${proto}/${t}/${name}`)
    mutateAll()
  }

  if (!overview || !entrypoints) {
    return <div className="space-y-4 animate-pulse"><div className="h-32 glass" /><div className="h-64 glass" /></div>
  }

  const rArr = Array.isArray(routers) ? routers : []
  const sArr = Array.isArray(services) ? services : []
  const mArr = Array.isArray(middlewares) ? middlewares : []

  return (
    <div className="space-y-4">
      <HealthBanner overview={overview} entrypoints={entrypoints} />

      {/* Quick links to platform features */}
      <QuickLinks />

      {/* Protocol selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['http', 'tcp', 'udp'].map(p => (
            <button key={p} onClick={() => setProto(p)} className="px-3 py-1 rounded-lg text-xs font-bold uppercase" style={proto === p ? { backgroundColor: '#2AA2C1', color: '#fff' } : { backgroundColor: '#27272a', color: '#a1a1aa' }}>{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-2 rounded-lg text-xs w-64 outline-none" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }} />
          </div>
        </div>
      </div>

      {/* Resource tabs */}
      <div className="flex border-b border-zinc-800">
        {(['routers', 'services', 'middlewares'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-xs font-semibold capitalize border-b-2 transition-colors ${tab === t ? 'border-brand text-brand' : 'border-transparent text-zinc-500 hover:text-white'}`}>
            {t} ({t === 'routers' ? rArr.length : t === 'services' ? sArr.length : mArr.length})
          </button>
        ))}
      </div>

      {/* Tables */}
      <div className="glass p-4">
        {tab === 'routers' && <ResourceTable data={rArr} type="router" onSelect={setDetail} onEdit={handleEdit} onDelete={handleDelete} search={search} />}
        {tab === 'services' && <ResourceTable data={sArr} type="service" onSelect={setDetail} onEdit={handleEdit} onDelete={handleDelete} search={search} />}
        {tab === 'middlewares' && <ResourceTable data={mArr} type="middleware" onSelect={setDetail} onEdit={handleEdit} onDelete={handleDelete} search={search} />}
      </div>

      {/* Entrypoints */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Entrypoints</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {entrypoints.map(ep => (
            <div key={ep.name} className="glass p-3 flex items-center gap-3" style={{ borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: '#2AA2C1' }}>
              <Activity size={16} className="text-brand" />
              <div><p className="text-sm font-bold uppercase">{ep.name}</p><p className="text-xs text-zinc-400 font-mono">{ep.address}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <Modal open={true} onClose={() => setEditing(null)} color="#f59e0b">
          <h3 className="font-semibold text-lg mb-4" style={{ color: '#f59e0b' }}>Edit: {editing.name}</h3>
          <textarea value={editJson} onChange={e => setEditJson(e.target.value)} rows={16} className="w-full rounded-lg px-4 py-3 text-xs font-mono outline-none resize-y" style={{ backgroundColor: '#09090b', borderWidth: 1, borderStyle: 'solid', borderColor: '#27272a', color: '#34d399', minHeight: 200 }} />
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={14} />Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg text-white font-semibold flex items-center gap-1" style={{ backgroundColor: '#f59e0b' }}><Save size={14} />Save</button>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {detail && <DetailModal data={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
