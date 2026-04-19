import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Save, X } from 'lucide-react'
import type { Router, Service, Middleware } from '@/types/api'

function mutateAll() { mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares') }

const TABS = ['Routers', 'Services', 'Middlewares', 'Operations'] as const

const MW_TYPES: Record<string, unknown> = {
  'apiKey': { apiKey: { headerName: 'X-API-Key', keys: [{ value: 'your-key', metadata: 'user' }] } },
  'rateLimit': { rateLimit: { average: 100, burst: 50, period: '1s' } },
  'waf': { waf: { inlineRules: 'SecRuleEngine On\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"' } },
  'jwtAuth': { jwtAuth: { jwksUrl: 'https://auth.example.com/.well-known/jwks.json', issuer: 'https://auth.example.com' } },
  'oidc': { oidc: { issuerUrl: 'https://accounts.google.com', clientId: 'id', clientSecret: 'secret', redirectUrl: 'https://app/callback' } },
  'hmac': { hmac: { secret: 'shared-secret', algorithm: 'sha256', headerName: 'X-Signature' } },
  'httpCache': { httpCache: { defaultTtl: '300s', maxEntries: 5000 } },
  'apiMock': { apiMock: { specFile: '/etc/traefik/specs/api.yaml', defaultStatus: 200 } },
  'basicAuth': { basicAuth: { users: ['admin:$apr1$hash'] } },
}

function ResourceItem({ name, detail, editable, onDelete }: { name: string; detail: string; editable: boolean; onDelete: () => void }) {
  return (
    <div className={`flex justify-between items-center p-4 rounded-lg border ${editable ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900'}`}>
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-zinc-500">{detail}</p>
      </div>
      <div className="flex items-center gap-2">
        {!editable && <span className="text-[10px] text-zinc-600 uppercase">read-only</span>}
        {editable && <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>}
      </div>
    </div>
  )
}

function RouterForm({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(''); const [r, setR] = useState(''); const [s, setS] = useState(''); const [e, setE] = useState('web'); const [m, setM] = useState('')
  const save = async () => {
    const cfg: Record<string, unknown> = { rule: r, service: s, entryPoints: e.split(',').map(x => x.trim()) }
    if (m) cfg.middlewares = m.split(',').map(x => x.trim())
    await api.put(`/config/http/routers/${n}`, cfg); mutateAll(); onDone()
  }
  return (
    <div className="bg-zinc-900 border border-brand/30 rounded-xl p-5 space-y-3">
      <p className="font-semibold text-sm text-brand">New Router</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-zinc-500">Name</label><input value={n} onChange={e => setN(e.target.value)} placeholder="e.g. my-api" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none" /></div>
        <div><label className="text-xs text-zinc-500">Service</label><input value={s} onChange={e => setS(e.target.value)} placeholder="e.g. backend-svc" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none" /></div>
      </div>
      <div><label className="text-xs text-zinc-500">Rule</label><input value={r} onChange={e => setR(e.target.value)} placeholder='e.g. Host(`app.example.com`) && PathPrefix(`/api`)' className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-zinc-500">Entry Points</label><input value={e} onChange={ev => setE(ev.target.value)} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none" /></div>
        <div><label className="text-xs text-zinc-500">Middlewares</label><input value={m} onChange={e => setM(e.target.value)} placeholder="e.g. auth,rate-limit" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none" /></div>
      </div>
      <p className="text-[10px] text-zinc-600">Entry points: web (HTTP), websecure (HTTPS). Middlewares: comma-separated names.</p>
      <div className="flex gap-2 justify-end"><button onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700"><X size={12} className="inline mr-1" />Cancel</button><button onClick={save} disabled={!n||!r||!s} className="px-3 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand/80 text-black font-semibold disabled:opacity-30"><Save size={12} className="inline mr-1" />Create</button></div>
    </div>
  )
}

function ServiceForm({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(''); const [u, setU] = useState('http://127.0.0.1:8080'); const [h, setH] = useState('/health')
  const save = async () => {
    const servers = u.split('\n').filter(Boolean).map(x => ({ url: x.trim() }))
    const cfg: Record<string, unknown> = { loadBalancer: { servers, healthCheck: h ? { path: h, interval: '10s' } : undefined } }
    await api.put(`/config/http/services/${n}`, cfg); mutateAll(); onDone()
  }
  return (
    <div className="bg-zinc-900 border border-purple-900/30 rounded-xl p-5 space-y-3">
      <p className="font-semibold text-sm text-purple-400">New Service</p>
      <div><label className="text-xs text-zinc-500">Name</label><input value={n} onChange={e => setN(e.target.value)} placeholder="e.g. my-backend" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none" /></div>
      <div><label className="text-xs text-zinc-500">Backend URLs (one per line)</label><textarea value={u} onChange={e => setU(e.target.value)} rows={3} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-brand outline-none" /></div>
      <div><label className="text-xs text-zinc-500">Health Check Path</label><input value={h} onChange={e => setH(e.target.value)} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none" /></div>
      <div className="flex gap-2 justify-end"><button onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700"><X size={12} className="inline mr-1" />Cancel</button><button onClick={save} disabled={!n} className="px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold disabled:opacity-30"><Save size={12} className="inline mr-1" />Create</button></div>
    </div>
  )
}

function MiddlewareForm({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(''); const [t, setT] = useState('apiKey'); const [j, setJ] = useState(JSON.stringify(MW_TYPES['apiKey'], null, 2))
  const changeType = (v: string) => { setT(v); setJ(JSON.stringify(MW_TYPES[v] || {}, null, 2)) }
  const save = async () => { try { await api.put(`/config/http/middlewares/${n}`, JSON.parse(j)); mutateAll(); onDone() } catch {} }
  return (
    <div className="bg-zinc-900 border border-emerald-900/30 rounded-xl p-5 space-y-3">
      <p className="font-semibold text-sm text-emerald-400">New Middleware</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-zinc-500">Name</label><input value={n} onChange={e => setN(e.target.value)} placeholder="e.g. my-auth" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none" /></div>
        <div><label className="text-xs text-zinc-500">Type</label><select value={t} onChange={e => changeType(e.target.value)} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand outline-none">
          <option value="apiKey">🔑 API Key</option><option value="rateLimit">⚡ Rate Limit</option><option value="waf">🛡️ WAF</option>
          <option value="jwtAuth">🔐 JWT</option><option value="oidc">🔓 OIDC</option><option value="hmac">✍️ HMAC</option>
          <option value="httpCache">💾 Cache</option><option value="apiMock">🎭 Mock</option><option value="basicAuth">👤 Basic Auth</option>
        </select></div>
      </div>
      <p className="text-[10px] text-zinc-600">Select type to auto-fill template. Edit values as needed.</p>
      <div><label className="text-xs text-zinc-500">Configuration (JSON)</label><textarea value={j} onChange={e => setJ(e.target.value)} rows={6} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono focus:border-brand outline-none" /></div>
      <div className="flex gap-2 justify-end"><button onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700"><X size={12} className="inline mr-1" />Cancel</button><button onClick={save} disabled={!n} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-30"><Save size={12} className="inline mr-1" />Create</button></div>
    </div>
  )
}

function OpsTab() {
  const [st, setSt] = useState('')
  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">System Operations</h3>
        <div className="flex gap-3">
          <button onClick={async () => { await api.post('/reload'); setSt('Reload triggered'); setTimeout(() => setSt(''), 3000) }} className="px-4 py-2 bg-brand hover:bg-brand/80 text-black font-semibold rounded-lg text-sm">🔄 Reload Config</button>
          <button onClick={() => window.open('/api/config/backup', '_blank')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">📥 Download Backup</button>
        </div>
        {st && <p className="text-emerald-400 text-sm">✓ {st}</p>}
      </div>
    </div>
  )
}

export function ConfigPage() {
  const { data: routers } = useSWR<Router[]>('/http/routers', fetcher)
  const { data: services } = useSWR<Service[]>('/http/services', fetcher)
  const { data: middlewares } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const [tab, setTab] = useState<typeof TABS[number]>('Routers')
  const [form, setForm] = useState<string | null>(null)

  const del = (type: string, name: string) => { if (confirm(`Delete "${name}"?`)) api.del(`/config/http/${type}/${name.replace(/@.*/, '')}`).then(mutateAll) }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold">Config Manager</h1>
      </div>
      <p className="text-sm text-zinc-500">Create, edit, and delete configuration. Proxy changes apply immediately.</p>

      <div className="flex border-b border-zinc-800">
        {TABS.map(t => <button key={t} onClick={() => { setTab(t); setForm(null) }} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-brand text-brand' : 'border-transparent text-zinc-500 hover:text-white'}`}>{t}</button>)}
      </div>

      {tab !== 'Operations' && (
        <div className="flex gap-2">
          {tab === 'Routers' && <button onClick={() => setForm('router')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14} />Add Router</button>}
          {tab === 'Services' && <button onClick={() => setForm('service')} className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/20"><Plus size={14} />Add Service</button>}
          {tab === 'Middlewares' && <button onClick={() => setForm('middleware')} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20"><Plus size={14} />Add Middleware</button>}
        </div>
      )}

      {form === 'router' && <RouterForm onDone={() => setForm(null)} />}
      {form === 'service' && <ServiceForm onDone={() => setForm(null)} />}
      {form === 'middleware' && <MiddlewareForm onDone={() => setForm(null)} />}

      {tab === 'Routers' && <div className="space-y-2">{(routers || []).map(r => <ResourceItem key={r.name} name={r.name} detail={r.rule || r.status} editable={r.provider === 'file'} onDelete={() => del('routers', r.name)} />)}</div>}
      {tab === 'Services' && <div className="space-y-2">{(services || []).map(s => <ResourceItem key={s.name} name={s.name} detail={s.type || s.status} editable={s.provider === 'file'} onDelete={() => del('services', s.name)} />)}</div>}
      {tab === 'Middlewares' && <div className="space-y-2">{(middlewares || []).map(m => <ResourceItem key={m.name} name={m.name} detail={m.type} editable={m.provider === 'file'} onDelete={() => del('middlewares', m.name)} />)}</div>}
      {tab === 'Operations' && <OpsTab />}
    </div>
  )
}
