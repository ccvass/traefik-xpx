import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus } from 'lucide-react'
import type { Middleware } from '@/types/api'
import { AddForm, Item, Stat, mutateAll } from './shared'

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
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20}/></Link><span className="text-2xl">🛡️</span><h1 className="text-2xl font-bold">Security</h1></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => startAdd('waf')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>WAF</button>
          <button onClick={() => startAdd('apikey')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>API Key</button>
          <button onClick={() => startAdd('jwt')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>JWT</button>
          <button onClick={() => startAdd('oidc')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>OIDC</button>
          <button onClick={() => startAdd('hmac')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>HMAC</button>
        </div>
      </div>
      {adding && <AddForm title={`New ${adding}`} name={name} setName={setName} json={json} setJson={setJson} color="brand" onSave={save} onCancel={() => setAdding(null)} disabled={!name} />}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat value={all.filter(m=>m.type==='waf').length} label="WAF Rules" />
        <Stat value={all.filter(m=>m.type==='apikey').length} label="API Keys" />
        <Stat value={all.filter(m=>['jwt','jwtAuth'].includes(m.type)).length} label="JWT Auth" />
        <Stat value={all.filter(m=>m.type==='opa').length} label="OPA Policies" />
        <Stat value={sec.length} label="Total Security" />
      </div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Active Security Middlewares ({sec.length})</h2>
      {sec.length ? <div className="space-y-2">{sec.map(m => <Item key={m.name} name={m.name} detail={`${m.type} • ${m.status}`} editable={m.provider==='file'} onDelete={() => del(m.name)} />)}</div> : <p className="text-zinc-600 text-sm">No security middlewares. Use the buttons above to create one.</p>}
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
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20}/></Link><span className="text-2xl">⚡</span><h1 className="text-2xl font-bold">Distributed</h1></div>
        <div className="flex gap-2">
          <button onClick={() => startAdd('ratelimit')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>Rate Limiter</button>
          <button onClick={() => startAdd('httpcache')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>HTTP Cache</button>
          <button onClick={() => startAdd('inflightreq')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>In-Flight Limit</button>
        </div>
      </div>
      {adding && <AddForm title={`New ${adding}`} name={name} setName={setName} json={json} setJson={setJson} color="brand" onSave={save} onCancel={() => setAdding(null)} disabled={!name} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value={all.filter(m=>m.type==='ratelimit').length} label="Rate Limiters" />
        <Stat value={all.filter(m=>m.type==='httpcache').length} label="HTTP Caches" />
        <Stat value={all.filter(m=>m.type==='inflightreq').length} label="In-Flight" />
        <Stat value={dist.length} label="Total" />
      </div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Active Distributed Middlewares ({dist.length})</h2>
      {dist.length ? <div className="space-y-2">{dist.map(m => <Item key={m.name} name={m.name} detail={`${m.type} • ${m.status}`} editable={m.provider==='file'} onDelete={() => del(m.name)} />)}</div> : <p className="text-zinc-600 text-sm">No distributed middlewares. Use the buttons above to create one.</p>}
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
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20}/></Link><span className="text-2xl">📦</span><h1 className="text-2xl font-bold">API Management</h1></div>
        <div className="flex gap-2">
          <button onClick={() => startAdd('router')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>Add API Route</button>
          <button onClick={() => startAdd('apimock')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14}/>Add Mock</button>
        </div>
      </div>
      {adding && <AddForm title={`New ${adding}`} name={name} setName={setName} json={json} setJson={setJson} color="brand" onSave={save} onCancel={() => setAdding(null)} disabled={!name} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value={fileR.length} label="Managed APIs" />
        <Stat value={all.length} label="Total Middlewares" />
        <Stat value={all.filter(m=>m.type==='apimock').length} label="Mock Endpoints" />
        <Stat value={fileR.length > 0 ? 'Active' : 'Inactive'} label="Status" />
      </div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">API Routes ({fileR.length})</h2>
      {fileR.length ? <div className="space-y-2">{fileR.map((r: any) => <Item key={r.name} name={r.name} detail={r.rule} editable={true} onDelete={() => del(r.name, 'routers')} />)}</div> : <p className="text-zinc-600 text-sm">No managed APIs. Click "Add API Route" to create one.</p>}
    </div>
  )
}
