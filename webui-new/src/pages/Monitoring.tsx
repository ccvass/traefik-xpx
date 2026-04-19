import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import { ArrowLeft, Activity, Heart, BarChart3, FileText, RefreshCw } from 'lucide-react'

// #182 — Logs viewer
export function LogsPage() {
  const [logType, setLogType] = useState('traefik')
  const { data, mutate: refresh } = useSWR(`/logs?type=${logType}`, fetcher, { refreshInterval: 5000 })
  const logs = (data as any)?.lines || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link><FileText size={24} className="text-brand" /><h1 className="text-2xl font-bold">Logs</h1></div>
        <div className="flex gap-2">
          <button onClick={() => setLogType('traefik')} className={`px-3 py-1 rounded-lg text-xs font-semibold ${logType === 'traefik' ? 'bg-brand text-white' : 'bg-zinc-800 text-zinc-400'}`}>Traefik</button>
          <button onClick={() => setLogType('access')} className={`px-3 py-1 rounded-lg text-xs font-semibold ${logType === 'access' ? 'bg-brand text-white' : 'bg-zinc-800 text-zinc-400'}`}>Access</button>
          <button onClick={() => refresh()} className="px-3 py-1 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1"><RefreshCw size={12} />Refresh</button>
        </div>
      </div>
      <div className="text-xs text-zinc-500">{(data as any)?.total || 0} total lines • showing last {logs.length} • auto-refresh 5s</div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 max-h-[70vh] overflow-y-auto">
        <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap break-all leading-5">
          {logs.length ? logs.join('\n') : 'No logs available. Check log file path in Settings.'}
        </pre>
      </div>
    </div>
  )
}

// #183 — Metrics
export function MetricsPage() {
  const { data: metrics } = useSWR('/metrics/internal', fetcher, { refreshInterval: 5000 })
  const { data: overview } = useSWR('/overview', fetcher, { refreshInterval: 5000 })
  const m = (metrics || {}) as Record<string, number>
  const ov = overview as any

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link><BarChart3 size={24} className="text-brand" /><h1 className="text-2xl font-bold">Metrics</h1></div>
      <p className="text-xs text-zinc-500">Internal metrics • auto-refresh 5s</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(m).map(([k, v]) => (
          <div key={k} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-3xl font-bold">{v}</p>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
          </div>
        ))}
      </div>

      {ov?.features && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">Feature Status</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(ov.features).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center p-3 bg-zinc-800 rounded-lg text-sm">
                <span className="text-zinc-400 capitalize">{k}</span>
                <span className={`text-xs font-semibold ${v ? 'text-emerald-400' : 'text-zinc-600'}`}>{v ? (typeof v === 'boolean' ? 'ON' : String(v)) : 'OFF'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ov?.providers && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">Active Providers</h3>
          <div className="flex gap-3">
            {Object.entries(ov.providers).filter(([, v]) => v).map(([k]) => (
              <div key={k} className="px-4 py-2 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-sm text-emerald-400 capitalize">{k}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// #184 — Health checks
export function HealthPage() {
  const { data: health } = useSWR('/health-checks', fetcher, { refreshInterval: 5000 })
  const { data: services } = useSWR('/http/services', fetcher)
  const checks = Array.isArray(health) ? health : []
  const svcs = Array.isArray(services) ? services : []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link><Heart size={24} className="text-brand" /><h1 className="text-2xl font-bold">Service Health</h1></div>
      <p className="text-xs text-zinc-500">{svcs.length} services • auto-refresh 5s</p>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-3xl font-bold text-emerald-400">{svcs.filter((s: any) => s.status === 'enabled').length}</p>
          <p className="text-xs text-zinc-500 mt-1">Healthy</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-3xl font-bold text-amber-400">{svcs.filter((s: any) => s.status === 'warning').length}</p>
          <p className="text-xs text-zinc-500 mt-1">Warning</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-3xl font-bold text-red-400">{svcs.filter((s: any) => s.status === 'disabled').length}</p>
          <p className="text-xs text-zinc-500 mt-1">Unhealthy</p>
        </div>
      </div>

      <div className="space-y-2">
        {svcs.map((s: any) => (
          <div key={s.name} className={`flex justify-between items-center p-4 rounded-lg border ${s.status === 'enabled' ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-red-900/50 bg-red-950/10'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'enabled' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div>
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  {s.loadBalancer?.servers ? `${s.loadBalancer.servers.length} server(s)` : s.type || 'internal'}
                  {s.loadBalancer?.healthCheck && ` • health: ${s.loadBalancer.healthCheck.path}`}
                  {' • '}{s.provider}
                </p>
              </div>
            </div>
            <span className={`text-xs font-semibold ${s.status === 'enabled' ? 'text-emerald-400' : 'text-red-400'}`}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
