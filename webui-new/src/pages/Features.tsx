import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import { ArrowLeft, Settings } from 'lucide-react'
import type { Middleware } from '@/types/api'

function StatusPage({ title, icon, metrics, configTab }: { title: string; icon: string; metrics: { label: string; value: string | number }[]; configTab?: string }) {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
        </div>
        <Link to="/config" className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand/80 text-black font-semibold rounded-lg text-sm"><Settings size={14} />Configure</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-3xl font-bold">{m.value}</p>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>
      {mws && mws.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">Related Middlewares</h3>
          <div className="space-y-2">
            {mws.filter(m => m.provider === 'file').map(m => (
              <div key={m.name} className="flex justify-between items-center text-sm py-1.5 border-b border-zinc-800 last:border-0">
                <span>{m.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{m.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AIPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const ai = (mws || []).filter(m => ['aigateway', 'semanticcache', 'piiguard'].includes(m.type))
  return <StatusPage title="AI Gateway" icon="🤖" metrics={[
    { label: 'AI Middlewares', value: ai.length },
    { label: 'Semantic Cache', value: ai.some(m => m.type === 'semanticcache') ? 'On' : 'Off' },
    { label: 'PII Guard', value: ai.some(m => m.type === 'piiguard') ? 'On' : 'Off' },
    { label: 'Status', value: ai.length > 0 ? 'Active' : 'Inactive' },
  ]} />
}

export function MCPPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const mcp = (mws || []).filter(m => ['tbac', 'mcpgovernance', 'mcppolicy', 'mcpaudit'].includes(m.type))
  return <StatusPage title="MCP Gateway" icon="🔧" metrics={[
    { label: 'MCP Middlewares', value: mcp.length },
    { label: 'TBAC Engine', value: mcp.some(m => m.type === 'tbac') ? 'On' : 'Off' },
    { label: 'Audit Logger', value: mcp.some(m => m.type === 'mcpaudit') ? 'On' : 'Off' },
    { label: 'Status', value: mcp.length > 0 ? 'Active' : 'Inactive' },
  ]} />
}

export function SecurityPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const all = mws || []
  return <StatusPage title="Security" icon="🛡️" metrics={[
    { label: 'WAF Rules', value: all.filter(m => m.type === 'waf').length },
    { label: 'Auth Middlewares', value: all.filter(m => ['apikey', 'jwt', 'oidc', 'hmac', 'ldap', 'basicauth'].includes(m.type)).length },
    { label: 'OPA Policies', value: all.filter(m => m.type === 'opa').length },
    { label: 'Total Security', value: all.filter(m => ['waf', 'apikey', 'jwt', 'oidc', 'hmac', 'ldap', 'basicauth', 'opa'].includes(m.type)).length },
  ]} />
}

export function DistributedPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const all = mws || []
  return <StatusPage title="Distributed" icon="⚡" metrics={[
    { label: 'Rate Limiters', value: all.filter(m => m.type === 'ratelimit').length },
    { label: 'HTTP Caches', value: all.filter(m => m.type === 'httpcache').length },
    { label: 'In-Flight', value: all.filter(m => m.type === 'inflightreq').length },
    { label: 'Total', value: all.filter(m => ['ratelimit', 'httpcache', 'inflightreq'].includes(m.type)).length },
  ]} />
}

export function APIMgmtPage() {
  const { data: routers } = useSWR('/http/routers', fetcher)
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const fileR = Array.isArray(routers) ? routers.filter((r: any) => r.provider === 'file').length : 0
  return <StatusPage title="API Management" icon="📦" metrics={[
    { label: 'Managed APIs', value: fileR },
    { label: 'Total Middlewares', value: (mws || []).length },
    { label: 'Mock Endpoints', value: (mws || []).filter(m => m.type === 'apimock').length },
    { label: 'Status', value: fileR > 0 ? 'Active' : 'Inactive' },
  ]} />
}
