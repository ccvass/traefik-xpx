import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus } from 'lucide-react'
import type { Middleware } from '@/types/api'
import { AddForm, Item, Stat, ActionBtn, mutateAll } from './shared'
import { COLORS, getCategoryColors, getTypeLabel } from '@/lib/design'

export function SecurityPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const all = mws || []
  const sec = all.filter(m => ['waf','apikey','jwt','jwtAuth','oidc','hmac','ldap','basicauth','opa'].includes(m.type))
  const [adding, setAdding] = useState<string|null>(null)
  const [name, setName] = useState(''); const [json, setJson] = useState('')

  const templates: Record<string,unknown> = {
    waf: { waf: { inlineRules: 'SecRuleEngine On\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"' } },
    apikey: { apiKey: { headerName: 'X-API-Key', keys: [{ value: 'your-key', metadata: 'user' }] } },
    jwt: { jwtAuth: { jwksUrl: 'https://auth.example.com/.well-known/jwks.json', issuer: 'https://auth.example.com' } },
    oidc: { oidc: { issuerUrl: 'https://accounts.google.com', clientId: 'id', clientSecret: 'secret', redirectUrl: 'https://app/callback' } },
    hmac: { hmac: { secret: 'shared-secret', algorithm: 'sha256', headerName: 'X-Signature' } },
  }
  const startAdd = (t: string) => { setAdding(t); setName(''); setJson(JSON.stringify(templates[t], null, 2)) }
  const save = async () => { try { await api.put(`/config/http/middlewares/${name}`, JSON.parse(json)); mutateAll(); setAdding(null) } catch {} }
  const del = (n: string) => { if(confirm(`Delete "${n}"?`)) api.del(`/config/http/middlewares/${n.replace(/@.*/,'')}`).then(mutateAll) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20}/></Link><h1 className="text-2xl font-bold">Security</h1></div>
        <div className="flex gap-2 flex-wrap">
          <ActionBtn label="Add WAF" onClick={() => startAdd('waf')} color={COLORS.security.accent} />
          <ActionBtn label="Add API Key" onClick={() => startAdd('apikey')} color={COLORS.auth.accent} />
          <ActionBtn label="Add JWT" onClick={() => startAdd('jwt')} color={COLORS.traffic.accent} />
          <ActionBtn label="Add OIDC" onClick={() => startAdd('oidc')} color={COLORS.cache.accent} />
          <ActionBtn label="Add HMAC" onClick={() => startAdd('hmac')} color={COLORS.resilience.accent} />
        </div>
      </div>
      {adding && <AddForm title={`New ${getTypeLabel(adding || '')}`} name={name} setName={setName} json={json} setJson={setJson} color={getCategoryColors(adding || "").accent} onSave={save} onCancel={() => setAdding(null)} disabled={!name} />}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat value={all.filter(m=>m.type==='waf').length} label="WAF Rules" color="#ef4444" />
        <Stat value={all.filter(m=>m.type==='apikey').length} label="API Keys" color="#f59e0b" />
        <Stat value={all.filter(m=>['jwt','jwtAuth'].includes(m.type)).length} label="JWT Auth" color={COLORS.identity.accent} />
        <Stat value={all.filter(m=>m.type==='opa').length} label="OPA Policies" color={COLORS.traffic.accent} />
        <Stat value={sec.length} label="Total Security" color={COLORS.brand} />
      </div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Active Security Middlewares ({sec.length})</h2>
      {sec.length ? <div className="space-y-2">{sec.map(m => <Item key={m.name} name={m.name} type={m.type} status={m.status} provider={m.provider} onDelete={() => del(m.name)} />)}</div> : <p className="text-zinc-600 text-sm">No security middlewares. Use the buttons above to create one.</p>}
    </div>
  )
}

export function DistributedPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const all = mws || []
  const dist = all.filter(m => ['ratelimit','httpcache','inflightreq','distributedratelimit'].includes(m.type))
  const [adding, setAdding] = useState<string|null>(null)
  const [name, setName] = useState(''); const [json, setJson] = useState('')

  const templates: Record<string,unknown> = {
    ratelimit: { rateLimit: { average: 100, burst: 50, period: '1s' } },
    httpcache: { httpCache: { defaultTtl: '300s', maxEntries: 5000 } },
    inflightreq: { inFlightReq: { amount: 100 } },
  }
  const startAdd = (t: string) => { setAdding(t); setName(''); setJson(JSON.stringify(templates[t], null, 2)) }
  const save = async () => { try { await api.put(`/config/http/middlewares/${name}`, JSON.parse(json)); mutateAll(); setAdding(null) } catch {} }
  const del = (n: string) => { if(confirm(`Delete "${n}"?`)) api.del(`/config/http/middlewares/${n.replace(/@.*/,'')}`).then(mutateAll) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20}/></Link><h1 className="text-2xl font-bold">Distributed</h1></div>
        <div className="flex gap-2">
          <ActionBtn label="Add Rate Limiter" onClick={() => startAdd('ratelimit')} color={COLORS.traffic.accent} />
          <ActionBtn label="Add HTTP Cache" onClick={() => startAdd('httpcache')} color={COLORS.cache.accent} />
          <ActionBtn label="Add In-Flight" onClick={() => startAdd('inflightreq')} color={COLORS.resilience.accent} />
        </div>
      </div>
      {adding && <AddForm title={`New ${getTypeLabel(adding || '')}`} name={name} setName={setName} json={json} setJson={setJson} color={getCategoryColors(adding || "").accent} onSave={save} onCancel={() => setAdding(null)} disabled={!name} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value={all.filter(m=>m.type==='ratelimit').length} label="Rate Limiters" color="#3b82f6" />
        <Stat value={all.filter(m=>m.type==='httpcache').length} label="HTTP Caches" color="#06b6d4" />
        <Stat value={all.filter(m=>m.type==='inflightreq').length} label="In-Flight" color={COLORS.resilience.accent} />
        <Stat value={dist.length} label="Total" color={COLORS.brand} />
      </div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Active Distributed Middlewares ({dist.length})</h2>
      {dist.length ? <div className="space-y-2">{dist.map(m => <Item key={m.name} name={m.name} type={m.type} status={m.status} provider={m.provider} onDelete={() => del(m.name)} />)}</div> : <p className="text-zinc-600 text-sm">No distributed middlewares. Use the buttons above to create one.</p>}
    </div>
  )
}

export function APIMgmtPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const { data: routers } = useSWR('/http/routers', fetcher)
  const all = mws || []
  const fileR = Array.isArray(routers) ? routers.filter((r: any) => r.provider === 'file') : []
  const [adding, setAdding] = useState<string|null>(null)
  const [name, setName] = useState(''); const [json, setJson] = useState('')

  const templates: Record<string,unknown> = {
    apimock: { apiMock: { specFile: '/etc/traefik/specs/api.yaml', defaultStatus: 200 } },
    router: { rule: "Host(`api.example.com`)", service: "my-service", entryPoints: ["web"] },
  }
  const startAdd = (t: string) => { setAdding(t); setName(''); setJson(JSON.stringify(templates[t], null, 2)) }
  const save = async () => {
    try {
      const parsed = JSON.parse(json)
      if (adding === 'router') await api.put(`/config/http/routers/${name}`, parsed)
      else await api.put(`/config/http/middlewares/${name}`, parsed)
      mutateAll(); setAdding(null)
    } catch {}
  }
  const del = (n: string, type: string) => { if(confirm(`Delete "${n}"?`)) api.del(`/config/http/${type}/${n.replace(/@.*/,'')}`).then(mutateAll) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20}/></Link><h1 className="text-2xl font-bold">API Management</h1></div>
        <div className="flex gap-2">
          <ActionBtn label="Add API Route" onClick={() => startAdd('router')} color={COLORS.network.accent} />
          <ActionBtn label="Add Mock" onClick={() => startAdd('apimock')} color={COLORS.mock.accent} />
        </div>
      </div>
      {adding && <AddForm title={`New ${getTypeLabel(adding || '')}`} name={name} setName={setName} json={json} setJson={setJson} color={getCategoryColors(adding || "").accent} onSave={save} onCancel={() => setAdding(null)} disabled={!name} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value={fileR.length} label="Managed APIs" color={COLORS.network.accent} />
        <Stat value={all.length} label="Total Middlewares" color={COLORS.traffic.accent} />
        <Stat value={all.filter(m=>m.type==='apimock').length} label="Mock Endpoints" color={COLORS.mock.accent} />
        <Stat value={fileR.length > 0 ? 'Active' : 'Inactive'} label="Status" color={COLORS.ok.accent} />
      </div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">API Routes ({fileR.length})</h2>
      {fileR.length ? <div className="space-y-2">{fileR.map((r: any) => <Item key={r.name} name={r.name} type="router" status="enabled" provider="file" onDelete={() => del(r.name, 'routers')} />)}</div> : <p className="text-zinc-600 text-sm">No managed APIs. Click "Add API Route" to create one.</p>}
    </div>
  )
}
