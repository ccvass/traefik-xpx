import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Activity, Bot, Wrench, Shield, Zap, Package, BarChart3,
  Settings, MonitorDot, ArrowRight, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react'
import type { Overview, Entrypoint, Middleware } from '@/types/api'

function StatCard({ value, label, trend }: { value: number | string; label: string; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}

function FeaturePanel({ icon, title, to, active, metrics }: {
  icon: React.ReactNode; title: string; to: string; active: boolean
  metrics: { label: string; value: string | number }[]
}) {
  return (
    <Link to={to} className="group block">
      <div className={cn(
        'bg-zinc-900 border rounded-xl p-5 h-full transition-all duration-200',
        'hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-0.5',
        active ? 'border-emerald-800' : 'border-zinc-800'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={cn('p-2 rounded-lg', active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400')}>
              {icon}
            </div>
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>
          <div className={cn('w-2 h-2 rounded-full', active ? 'bg-emerald-400' : 'bg-zinc-600')} />
        </div>
        <div className="space-y-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-zinc-500">{m.label}</span>
              <span className="text-zinc-300 font-medium">{m.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-1 text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">
          {active ? 'View details' : 'Configure'} <ArrowRight size={12} />
        </div>
      </div>
    </Link>
  )
}

function HealthBanner({ overview, entrypoints }: { overview: Overview; entrypoints: Entrypoint[] }) {
  const errors = (overview.http.routers.errors || 0) + (overview.http.services.errors || 0)
  const warnings = (overview.http.routers.warnings || 0) + (overview.http.services.warnings || 0)
  const totalRoutes = overview.http.routers.total + overview.tcp.routers.total + (overview.udp?.routers?.total || 0)
  const totalSvc = overview.http.services.total + overview.tcp.services.total + (overview.udp?.services?.total || 0)

  return (
    <div className={cn(
      'rounded-xl p-5 border',
      errors > 0 ? 'bg-red-950/30 border-red-900/50' : 'bg-emerald-950/20 border-emerald-900/30'
    )}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {errors > 0 ? <XCircle className="text-red-400" size={24} /> :
           warnings > 0 ? <AlertTriangle className="text-amber-400" size={24} /> :
           <CheckCircle2 className="text-emerald-400" size={24} />}
          <div>
            <h2 className="font-bold text-lg">
              {errors > 0 ? `${errors} errors detected` : warnings > 0 ? `${warnings} warnings` : 'All systems operational'}
            </h2>
            <p className="text-sm text-zinc-400">
              {entrypoints.length} entrypoints • {Object.keys(overview.providers || {}).filter(k => overview.providers[k]).join(', ')} provider
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6">
          <StatCard value={totalRoutes} label="Routes" />
          <StatCard value={totalSvc} label="Services" />
          <StatCard value={overview.http.middlewares.total} label="Middlewares" />
          <StatCard value={entrypoints.length} label="Endpoints" />
        </div>
      </div>
    </div>
  )
}

function EntrypointList({ entrypoints }: { entrypoints: Entrypoint[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {entrypoints.map((ep) => (
        <div key={ep.name} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
          <Activity size={16} className="text-brand shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase">{ep.name}</p>
            <p className="text-xs text-zinc-500">{ep.address}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function QuickActions() {
  const actions = [
    { label: 'Config Manager', to: '/config', icon: <Settings size={14} /> },
    { label: 'Multi-Cluster', to: '/clusters', icon: <MonitorDot size={14} /> },
    { label: 'Grafana', to: '/grafana', icon: <BarChart3 size={14} /> },
  ]
  return (
    <div className="flex gap-2">
      {actions.map((a) => (
        <Link key={a.label} to={a.to} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors">
          {a.icon} {a.label}
        </Link>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { data: overview } = useSWR<Overview>('/overview', fetcher, { refreshInterval: 5000 })
  const { data: entrypoints } = useSWR<Entrypoint[]>('/entrypoints', fetcher)
  const { data: middlewares } = useSWR<Middleware[]>('/http/middlewares', fetcher)

  if (!overview || !entrypoints) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-zinc-900 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-zinc-900 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const mws = middlewares || []
  const waf = mws.filter(m => m.type === 'waf').length
  const auth = mws.filter(m => ['apikey','jwt','oidc','hmac','ldap','basicauth'].includes(m.type)).length
  const rl = mws.filter(m => m.type === 'ratelimit').length
  const cache = mws.filter(m => m.type === 'httpcache').length
  const fileApis = (mws.filter(m => m.provider === 'file') || []).length

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Health */}
      <HealthBanner overview={overview} entrypoints={entrypoints} />

      {/* Features */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Platform Features</h2>
          <QuickActions />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <FeaturePanel icon={<Bot size={18} />} title="AI Gateway" to="/ai" active={false} metrics={[
            { label: 'Semantic Cache', value: mws.some(m => m.type === 'semanticcache') ? 'Active' : 'Off' },
            { label: 'PII Guard', value: mws.some(m => m.type === 'piiguard') ? 'Active' : 'Off' },
          ]} />
          <FeaturePanel icon={<Wrench size={18} />} title="MCP Gateway" to="/mcp" active={false} metrics={[
            { label: 'TBAC Engine', value: mws.some(m => m.type === 'tbac') ? 'Active' : 'Off' },
            { label: 'Audit Logger', value: mws.some(m => m.type === 'mcpaudit') ? 'Active' : 'Off' },
          ]} />
          <FeaturePanel icon={<Shield size={18} />} title="Security" to="/security" active={waf + auth > 0} metrics={[
            { label: 'WAF Rules', value: waf },
            { label: 'Auth Middlewares', value: auth },
          ]} />
          <FeaturePanel icon={<Zap size={18} />} title="Distributed" to="/distributed" active={rl + cache > 0} metrics={[
            { label: 'Rate Limiters', value: rl },
            { label: 'HTTP Caches', value: cache },
          ]} />
          <FeaturePanel icon={<Package size={18} />} title="API Management" to="/api-mgmt" active={fileApis > 0} metrics={[
            { label: 'Managed APIs', value: fileApis },
            { label: 'Total Middlewares', value: mws.length },
          ]} />
          <FeaturePanel icon={<BarChart3 size={18} />} title="Observability" to="/grafana" active={true} metrics={[
            { label: 'Grafana Dashboards', value: 5 },
            { label: 'Metrics', value: overview.features?.metrics ? 'On' : 'Off' },
          ]} />
        </div>
      </div>

      {/* Entrypoints */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Entrypoints</h2>
        <EntrypointList entrypoints={entrypoints} />
      </div>

      {/* Proxy Summary */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Proxy Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['http', 'tcp', 'udp'] as const).map(proto => {
            const data = overview[proto]
            if (!data) return null
            const total = (data.routers?.total || 0) + (data.services?.total || 0) + ('middlewares' in data ? data.middlewares?.total || 0 : 0)
            if (total === 0) return null
            return (
              <div key={proto} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="font-bold uppercase text-xs text-zinc-500 mb-3">{proto}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Routers</span><span>{data.routers.total}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Services</span><span>{data.services.total}</span></div>
                  {'middlewares' in data && <div className="flex justify-between"><span className="text-zinc-400">Middlewares</span><span>{data.middlewares.total}</span></div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
