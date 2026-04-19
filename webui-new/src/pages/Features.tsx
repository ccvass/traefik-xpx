import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Save, X, Settings } from 'lucide-react'
import type { Middleware } from '@/types/api'

function mutateAll() { mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares') }

function Btn({ children, onClick, variant = 'brand', disabled }: { children: React.ReactNode; onClick: () => void; variant?: string; disabled?: boolean }) {
  const cls = variant === 'brand' ? 'bg-brand hover:bg-brand/80 text-black' : variant === 'red' ? 'bg-red-900/50 hover:bg-red-900 text-red-300' : 'bg-zinc-800 hover:bg-zinc-700'
  return <button onClick={onClick} disabled={disabled} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 ${cls}`}>{children}</button>
}

function QuickAddMiddleware({ type, template, label, onDone }: { type: string; template: Record<string, unknown>; label: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [json, setJson] = useState(JSON.stringify(template, null, 2))
  const save = async () => { try { await api.put(`/config/http/middlewares/${name}`, JSON.parse(json)); mutateAll(); onDone() } catch {} }
  return (
    <div className="bg-zinc-900 border border-brand/30 rounded-xl p-5 space-y-3">
      <p className="font-semibold text-sm text-brand">Add {label}</p>
      <div><label className="text-xs text-zinc-500">Middleware Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. my-${type}`} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" /></div>
      <div><label className="text-xs text-zinc-500">Configuration (JSON)</label><textarea value={json} onChange={e => setJson(e.target.value)} rows={5} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-brand" /></div>
      <div className="flex gap-2 justify-end"><Btn onClick={onDone} variant="gray"><X size={12} />Cancel</Btn><Btn onClick={save} disabled={!name}><Save size={12} />Create</Btn></div>
    </div>
  )
}

function MwList({ items, onDelete }: { items: Middleware[]; onDelete: (n: string) => void }) {
  if (!items.length) return <p className="text-sm text-zinc-600 py-4">No middlewares of this type configured.</p>
  return (
    <div className="space-y-2">
      {items.map(m => (
        <div key={m.name} className={`flex justify-between items-center p-4 rounded-lg border ${m.provider === 'file' ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900'}`}>
          <div><p className="font-medium text-sm">{m.name}</p><p className="text-xs text-zinc-500">{m.type} • {m.status}</p></div>
          {m.provider === 'file' && <button onClick={() => { if (confirm(`Delete "${m.name}"?`)) onDelete(m.name.replace(/@.*/, '')) }} className="p-1.5 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>}
        </div>
      ))}
    </div>
  )
}

function FeaturePage({ title, icon, filterTypes, addOptions, children }: {
  title: string; icon: string; filterTypes: string[]
  addOptions: { label: string; type: string; template: Record<string, unknown> }[]
  children?: React.ReactNode
}) {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const [adding, setAdding] = useState<typeof addOptions[0] | null>(null)
  const filtered = (mws || []).filter(m => filterTypes.includes(m.type))
  const del = (n: string) => { api.del(`/config/http/middlewares/${n}`).then(mutateAll) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link>
          <span className="text-2xl">{icon}</span>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <div className="flex gap-2">
          {addOptions.map(opt => (
            <Btn key={opt.type} onClick={() => setAdding(opt)}><Plus size={14} />{opt.label}</Btn>
          ))}
        </div>
      </div>

      {adding && <QuickAddMiddleware type={adding.type} template={adding.template} label={adding.label} onDone={() => setAdding(null)} />}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {addOptions.map(opt => {
          const count = (mws || []).filter(m => m.type === opt.type).length
          return (
            <div key={opt.type} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-3xl font-bold">{count}</p>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{opt.label}</p>
            </div>
          )
        })}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-3xl font-bold">{filtered.length}</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">Total Active</p>
        </div>
      </div>

      {children}

      {/* Middleware list */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Active Middlewares</h2>
        <MwList items={filtered} onDelete={del} />
      </div>
    </div>
  )
}

export function AIPage() {
  return <FeaturePage title="AI Gateway" icon="🤖" filterTypes={['aigateway', 'semanticcache', 'piiguard', 'contentguard']} addOptions={[
    { label: 'Semantic Cache', type: 'semanticcache', template: { semanticCache: { ttl: 3600, maxEntries: 10000, similarityThreshold: 0.92 } } },
    { label: 'PII Guard', type: 'piiguard', template: { piiguard: { patterns: ['email', 'phone', 'ssn'], action: 'redact' } } },
  ]} />
}

export function MCPPage() {
  return <FeaturePage title="MCP Gateway" icon="🔧" filterTypes={['tbac', 'mcpgovernance', 'mcppolicy', 'mcpaudit']} addOptions={[
    { label: 'TBAC Rule', type: 'tbac', template: { tbac: { rules: [{ agent: 'my-agent', tools: ['*'], scope: '*' }], defaultAction: 'deny' } } },
    { label: 'Audit Logger', type: 'mcpaudit', template: { mcpaudit: { logFile: '/var/log/traefik/mcp-audit.json', includePayload: false } } },
  ]} />
}

export function SecurityPage() {
  return <FeaturePage title="Security" icon="🛡️" filterTypes={['waf', 'apikey', 'jwt', 'oidc', 'hmac', 'ldap', 'basicauth', 'opa']} addOptions={[
    { label: 'WAF Rule', type: 'waf', template: { waf: { inlineRules: 'SecRuleEngine On\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"' } } },
    { label: 'API Key', type: 'apikey', template: { apiKey: { headerName: 'X-API-Key', keys: [{ value: 'your-key', metadata: 'user' }] } } },
    { label: 'JWT Auth', type: 'jwtAuth', template: { jwtAuth: { jwksUrl: 'https://auth.example.com/.well-known/jwks.json', issuer: 'https://auth.example.com' } } },
  ]} />
}

export function DistributedPage() {
  return <FeaturePage title="Distributed" icon="⚡" filterTypes={['ratelimit', 'httpcache', 'inflightreq', 'distributedratelimit']} addOptions={[
    { label: 'Rate Limiter', type: 'ratelimit', template: { rateLimit: { average: 100, burst: 50, period: '1s' } } },
    { label: 'HTTP Cache', type: 'httpcache', template: { httpCache: { defaultTtl: '300s', maxEntries: 5000 } } },
    { label: 'In-Flight Limit', type: 'inflightreq', template: { inFlightReq: { amount: 100 } } },
  ]} />
}

export function APIMgmtPage() {
  const { data: routers } = useSWR('/http/routers', fetcher)
  const fileR = Array.isArray(routers) ? routers.filter((r: any) => r.provider === 'file') : []
  return <FeaturePage title="API Management" icon="📦" filterTypes={['apiversioning', 'apimock']} addOptions={[
    { label: 'API Mock', type: 'apimock', template: { apiMock: { specFile: '/etc/traefik/specs/api.yaml', defaultStatus: 200 } } },
  ]}>
    {fileR.length > 0 && (
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Managed APIs ({fileR.length})</h2>
        <div className="space-y-2">
          {fileR.map((r: any) => (
            <div key={r.name} className="bg-zinc-900 border border-emerald-900/50 rounded-lg p-4 flex justify-between">
              <div><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-zinc-500">{r.rule}</p></div>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </FeaturePage>
}
