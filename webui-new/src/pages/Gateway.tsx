import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Save, X, Activity, Shield, Zap, Globe, Lock, Eye } from 'lucide-react'
import { AddForm, Item, Stat, mutateAll } from './shared'
import { EditForm, RouterFormFull, CertUploadForm } from './forms'
import { Modal } from '@/components/Modal'
import { StatusBadge, TypeBadge, StatusDot } from '@/components/Badge'
import { COLORS, statAccent, editableAccent } from '@/lib/design'
import { MiddlewareWizard } from '@/components/MiddlewareWizard'

const ALL_MW_TYPES: Record<string, { label: string; icon: string; template: unknown }> = {
  apiKey: { label: 'API Key', icon: 'key', template: { apiKey: { headerName: 'X-API-Key', keys: [{ value: 'key', metadata: 'user' }] } } },
  rateLimit: { label: 'Rate Limit', icon: 'zap', template: { rateLimit: { average: 100, burst: 50, period: '1s' } } },
  waf: { label: 'WAF', icon: 'shield', template: { waf: { inlineRules: 'SecRuleEngine On\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"' } } },
  jwtAuth: { label: 'JWT', icon: 'lock', template: { jwtAuth: { jwksUrl: 'https://auth.example.com/.well-known/jwks.json' } } },
  oidc: { label: 'OIDC', icon: 'lock', template: { oidc: { issuerUrl: 'https://accounts.google.com', clientId: 'id', clientSecret: 'secret', redirectUrl: 'https://app/cb' } } },
  hmac: { label: 'HMAC', icon: 'pen', template: { hmac: { secret: 'secret', algorithm: 'sha256', headerName: 'X-Signature' } } },
  basicAuth: { label: 'Basic Auth', icon: 'user', template: { basicAuth: { users: ['admin:$apr1$hash'] } } },
  httpCache: { label: 'HTTP Cache', icon: 'db', template: { httpCache: { defaultTtl: '300s', maxEntries: 5000 } } },
  inFlightReq: { label: 'In-Flight', icon: 'gauge', template: { inFlightReq: { amount: 100 } } },
  circuitBreaker: { label: 'Circuit Breaker', icon: 'zap', template: { circuitBreaker: { expression: 'NetworkErrorRatio() > 0.5' } } },
  retry: { label: 'Retry', icon: 'repeat', template: { retry: { attempts: 3, initialInterval: '100ms' } } },
  compress: { label: 'Compress', icon: 'box', template: { compress: {} } },
  headers: { label: 'Headers', icon: 'list', template: { headers: { customRequestHeaders: { 'X-Custom': 'value' } } } },
  ipAllowList: { label: 'IP Allow List', icon: 'globe', template: { ipAllowList: { sourceRange: ['10.0.0.0/8', '172.16.0.0/12'] } } },
  redirectScheme: { label: 'Redirect HTTPS', icon: 'arrow', template: { redirectScheme: { scheme: 'https', permanent: true } } },
  redirectRegex: { label: 'Redirect Regex', icon: 'arrow', template: { redirectRegex: { regex: '^http://(.*)$', replacement: 'https://${1}' } } },
  stripPrefix: { label: 'Strip Prefix', icon: 'scissors', template: { stripPrefix: { prefixes: ['/api'] } } },
  addPrefix: { label: 'Add Prefix', icon: 'plus', template: { addPrefix: { prefix: '/api' } } },
  replacePath: { label: 'Replace Path', icon: 'shuffle', template: { replacePath: { path: '/new' } } },
  forwardAuth: { label: 'Forward Auth', icon: 'key', template: { forwardAuth: { address: 'http://auth-service:4181' } } },
  buffering: { label: 'Buffering', icon: 'download', template: { buffering: { maxRequestBodyBytes: 10485760 } } },
  passTLSClientCert: { label: 'mTLS Headers', icon: 'lock', template: { passTLSClientCert: { pem: true, info: { subject: true, issuer: true } } } },
  apiMock: { label: 'API Mock', icon: 'mask', template: { apiMock: { specFile: '/etc/traefik/specs/api.yaml', defaultStatus: 200 } } },
}

const TABS = ['Services', 'Routes', 'Middlewares', 'TLS & Certs', 'Entrypoints', 'Providers'] as const

export function GatewayPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('Services')
  const [proto, setProto] = useState('http')
  const { data: routers } = useSWR(`/${proto}/routers`, fetcher)
  const { data: services } = useSWR(`/${proto}/services`, fetcher)
  const { data: middlewares } = useSWR(`/${proto}/middlewares`, fetcher)
  const { data: entrypoints } = useSWR('/entrypoints', fetcher)
  const { data: overview } = useSWR('/overview', fetcher)
  const { data: certs } = useSWR('/certificates', fetcher)
  const [form, setForm] = useState<string | null>(null)
  const [editing, setEditing] = useState<{type: string; name: string; data: unknown} | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [mwType, setMwType] = useState('apiKey')
  const [name, setName] = useState('')
  const [json, setJson] = useState('')

  const del = (type: string, n: string) => { if (confirm(`Delete "${n}"?`)) api.del(`/config/http/${type}/${n.replace(/@.*/, '')}`).then(mutateAll) }

  const startMw = (t: string) => { setForm('middleware'); setMwType(t); setName(''); setJson(JSON.stringify(ALL_MW_TYPES[t]?.template || {}, null, 2)) }
  const saveMw = async () => { try { await api.put(`/config/http/middlewares/${name}`, JSON.parse(json)); mutateAll(); setForm(null) } catch {} }
  const saveRouter = async () => { try { await api.put(`/config/http/routers/${name}`, JSON.parse(json)); mutateAll(); setForm(null) } catch {} }
  const saveService = async () => { try { await api.put(`/config/http/services/${name}`, JSON.parse(json)); mutateAll(); setForm(null) } catch {} }

  const ov = overview as any
  const rArr = Array.isArray(routers) ? routers : []
  const sArr = Array.isArray(services) ? services : []
  const mArr = Array.isArray(middlewares) ? middlewares : []
  const epArr = Array.isArray(entrypoints) ? entrypoints : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link>
          <Globe size={24} className="text-brand" />
          <h1 className="text-2xl font-bold">API Gateway</h1>
        </div>
        <div className="flex gap-2">
          {['http', 'tcp', 'udp'].map(p => (
            <button key={p} onClick={() => setProto(p)} className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${proto === p ? 'bg-brand text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat value={rArr.length} label="Routes" color={COLORS.brand} />
        <Stat value={sArr.length} label="Services" color={COLORS.identity.accent} />
        <Stat value={mArr.length} label="Middlewares" color={COLORS.network.accent} />
        <Stat value={epArr.length} label="Entrypoints" color={COLORS.traffic.accent} />
        <Stat value={rArr.filter((r: any) => r.status === 'enabled').length} label="Healthy" color={COLORS.ok.accent} />
        <Stat value={(ov?.http?.routers?.errors || 0) + (ov?.http?.services?.errors || 0)} label="Errors" color={COLORS.error.accent} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 overflow-x-auto">
        {TABS.map(t => <button key={t} onClick={() => { setTab(t); setForm(null) }} className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-brand text-brand' : 'border-transparent text-zinc-500 hover:text-white'}`}>{t}</button>)}
      </div>

      {/* Services Tab */}
      {tab === 'Services' && <>
        <button onClick={() => { setForm('service'); setName(''); setJson(JSON.stringify({ loadBalancer: { servers: [{ url: 'http://127.0.0.1:8080' }], healthCheck: { path: '/health', interval: '10s' } } }, null, 2)) }} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all" style={{ backgroundColor: '#a855f715', color: '#a855f7', borderWidth: 1, borderStyle: 'solid', borderColor: '#a855f730' }}><Plus size={14} />Add Service</button>
        {form === 'service' && <AddForm title="New Service" name={name} setName={setName} json={json} setJson={setJson} color="#a855f7" onSave={saveService} onCancel={() => setForm(null)} disabled={!name} typeKey="service" />}
        <div className="space-y-2">{sArr.map((s: any) => (
          <div key={s.name} onClick={() => setDetail(s)} className="p-4 rounded-lg border glass cursor-pointer hover:scale-[1.01] transition-all">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{s.name}</p>
                <div className="flex gap-2 mt-1 text-xs text-zinc-500 items-center">
                  {s.loadBalancer?.servers && <span>{s.loadBalancer.servers.length} server(s)</span>}
                  {s.loadBalancer?.healthCheck && <span>• health: {s.loadBalancer.healthCheck.path}</span>}
                  <span style={{ backgroundColor: '#71717a15', color: '#a1a1aa', borderRadius: 9999, padding: '1px 8px', fontSize: 10, borderWidth: 1, borderStyle: 'solid', borderColor: '#71717a30' }}>{s.provider}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                {s.provider === 'file' && <>
                  <button onClick={() => setEditing({type:'services', name: s.name.replace(/@.*/,''), data: s})} className="p-1 rounded hover:bg-amber-950 text-zinc-500 hover:text-amber-400" title="Edit"><Save size={14} /></button>
                  <button onClick={() => del('services', s.name)} className="p-1 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                </>}
              </div>
            </div>
          </div>
        ))}</div>
        {editing?.type === 'services' && <EditForm title={editing.name} endpoint={`/config/http/services/${editing.name}`} current={editing.data} onDone={() => setEditing(null)} />}
      </>}

      {/* Routes Tab */}
      {tab === 'Routes' && <>
        <button onClick={() => { setForm('router'); setName(''); setJson(JSON.stringify({ rule: "Host(`app.example.com`)", service: "my-service", entryPoints: ["web"], middlewares: [] }, null, 2)) }} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all" style={{ backgroundColor: '#2AA2C115', color: '#2AA2C1', borderWidth: 1, borderStyle: 'solid', borderColor: '#2AA2C130' }}><Plus size={14} />Add Route</button>
        {form === 'router' && <Modal open={true} onClose={() => setForm(null)} color="#2AA2C1"><RouterFormFull middlewares={mArr.map((m: any) => m.name.replace(/@.*/, ''))} onSave={async ({name: n, config}: any) => { await api.put(`/config/http/routers/${n}`, config); mutateAll(); setForm(null) }} onCancel={() => setForm(null)} /></Modal>}
        <div className="space-y-2">{rArr.map((r: any) => (
          <div key={r.name} onClick={() => setDetail(r)} className="p-4 rounded-lg border glass cursor-pointer hover:scale-[1.01] transition-all">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{r.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{r.rule}</p>
                <div className="flex gap-2 mt-1 text-xs text-zinc-600 items-center flex-wrap">
                  <span>→ {r.service}</span>
                  {r.tls && <span style={{ backgroundColor: '#10b98118', color: '#34d399', borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 600, borderWidth: 1, borderStyle: 'solid', borderColor: '#10b98140' }}>TLS</span>}
                  {r.middlewares?.length > 0 && <span style={{ backgroundColor: '#f9731618', color: '#fb923c', borderRadius: 9999, padding: '1px 8px', fontSize: 10, borderWidth: 1, borderStyle: 'solid', borderColor: '#f9731640' }}>MW: {r.middlewares.length}</span>}
                  {r.entryPoints && <span style={{ backgroundColor: '#3b82f618', color: '#60a5fa', borderRadius: 9999, padding: '1px 8px', fontSize: 10, borderWidth: 1, borderStyle: 'solid', borderColor: '#3b82f640' }}>EP: {r.entryPoints.join(', ')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.provider === 'file' && <>
                  <button onClick={() => setEditing({type:'routers', name: r.name.replace(/@.*/,''), data: r})} className="p-1 rounded hover:bg-amber-950 text-zinc-500 hover:text-amber-400" title="Edit"><Save size={14} /></button>
                  <button onClick={() => del('routers', r.name)} className="p-1 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                </>}
              </div>
            </div>
          </div>
        ))}</div>
        {editing?.type === 'routers' && <EditForm title={editing.name} endpoint={`/config/http/routers/${editing.name}`} current={editing.data} onDone={() => setEditing(null)} />}
      </>}

      {/* Middlewares Tab */}
      {tab === 'Middlewares' && <>
        <div className="flex gap-2 mb-2">
          <button onClick={() => setForm('wizard')} className="flex items-center gap-1 px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand/80">Middleware Wizard</button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {Object.entries(ALL_MW_TYPES).map(([k, v]) => (
            <button key={k} onClick={() => startMw(k)} className={`px-2.5 py-1.5 rounded-full text-[10px] font-semibold transition-all border ${
              k === 'waf' ? 'border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/40' :
              k === 'apiKey' || k === 'basicAuth' ? 'border-amber-900/50 bg-amber-950/30 text-amber-400 hover:bg-amber-900/40' :
              k === 'jwtAuth' || k === 'oidc' || k === 'hmac' || k === 'forwardAuth' ? 'border-purple-900/50 bg-purple-950/30 text-purple-400 hover:bg-purple-900/40' :
              k === 'rateLimit' || k === 'inFlightReq' ? 'border-blue-700/50 bg-blue-950/30 text-blue-400 hover:bg-blue-900/40' :
              k === 'circuitBreaker' || k === 'retry' ? 'border-orange-700/50 bg-orange-950/30 text-orange-400 hover:bg-orange-900/40' :
              k === 'httpCache' ? 'border-cyan-700/50 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-900/40' :
              k === 'ipAllowList' || k === 'passTLSClientCert' ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40' :
              k === 'apiMock' ? 'border-pink-700/50 bg-pink-950/30 text-pink-400 hover:bg-pink-900/40' :
              'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
            }`}>{v.label}</button>
          ))}
        </div>
        {form === 'wizard' && <Modal open={true} onClose={() => setForm(null)} color="#10b981"><MiddlewareWizard onDone={() => setForm(null)} /></Modal>}
      {form === 'middleware' && <>
          <div className="flex gap-2 items-center mb-2">
            <span className="text-xs text-zinc-500">Selected:</span>
            <select value={mwType} onChange={e => { setMwType(e.target.value); setJson(JSON.stringify(ALL_MW_TYPES[e.target.value]?.template || {}, null, 2)) }} className="rounded px-2 py-1 text-xs outline-none" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }}>
              {Object.entries(ALL_MW_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <AddForm title={`New ${ALL_MW_TYPES[mwType]?.label || mwType}`} name={name} setName={setName} json={json} setJson={setJson} color="emerald" onSave={saveMw} onCancel={() => setForm(null)} disabled={!name} typeKey="service" />
        </>}
        <div className="space-y-2">{mArr.map((m: any) => (
          <div key={m.name} onClick={() => setDetail(m)} className="flex justify-between items-center p-4 rounded-lg border glass cursor-pointer hover:scale-[1.01] transition-all">
            <div>
              <p className="font-medium text-sm">{m.name}</p>
              <div className="flex items-center gap-2 mt-1"><TypeBadge type={m.type} /><StatusBadge status={m.status} /><span style={{ fontSize: 10, color: '#52525b' }}>{m.provider}</span></div>
            </div>
            <div className="flex items-center gap-2">
              {m.provider === 'file' && <>
                <button onClick={() => setEditing({type:'middlewares', name: m.name.replace(/@.*/,''), data: m})} className="p-1 rounded hover:bg-amber-950 text-zinc-500 hover:text-amber-400" title="Edit"><Save size={14} /></button>
                <button onClick={() => del('middlewares', m.name)} className="p-1 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
              </>}
            </div>
          </div>
        ))}</div>
        {editing?.type === 'middlewares' && <EditForm title={editing.name} endpoint={`/config/http/middlewares/${editing.name}`} current={editing.data} onDone={() => setEditing(null)} />}
      </>}

      {/* TLS Tab */}
      {tab === 'TLS & Certs' && <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat value={Array.isArray(certs) ? certs.length : 0} label="Certificates" color={COLORS.network.accent} />
          <Stat value={rArr.filter((r: any) => r.tls).length} label="TLS Routes" color={COLORS.identity.accent} />
          <Stat value={ov?.features?.acme ? 'Active' : 'Off'} label="ACME" color={COLORS.ok.accent} />
          <Stat value={rArr.filter((r: any) => r.tls?.certResolver).length} label="Auto-Managed" color={COLORS.traffic.accent} />
        </div>
        {Array.isArray(certs) && certs.length > 0 && <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Certificates</h3>
          {certs.map((cert: any, i: number) => (
            <div key={i} className="glass p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{cert.sans?.join(', ') || cert.domain?.main || 'Unknown'}</p>
                  <p className="text-xs text-zinc-500">{cert.domain?.sans?.length ? cert.domain.sans.length + ' SANs' : ''} {cert.resolverName ? '• Resolver: ' + cert.resolverName : ''}</p>
                </div>
                <Lock size={14} className="text-emerald-400" />
              </div>
            </div>
          ))}
        </div>}
        <button onClick={() => setForm('cert')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-medium hover:bg-brand/20"><Plus size={14} />Upload Certificate</button>
        {form === 'cert' && <Modal open={true} onClose={() => setForm(null)} color="#10b981"><CertUploadForm onDone={() => setForm(null)} /></Modal>}
        {(!certs || (Array.isArray(certs) && certs.length === 0)) && <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-6 text-center">
          <Lock size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No certificates loaded</p>
          <p className="text-zinc-600 text-xs mt-1">Configure ACME (Let's Encrypt) in traefik.yml or add TLS certs via file provider</p>
        </div>}
        <div className="glass p-5">
          <h3 className="font-semibold text-sm mb-2">TLS Routes</h3>
          <div className="space-y-2">
            {rArr.filter((r: any) => r.tls).map((r: any) => (
              <div key={r.name} className="flex justify-between items-center p-3 bg-zinc-800 rounded-lg text-sm">
                <div><p className="font-medium">{r.name}</p><p className="text-xs text-zinc-500">{r.rule}</p></div>
                <div className="text-xs text-zinc-400">{r.tls?.certResolver || 'manual cert'}</div>
              </div>
            ))}
            {rArr.filter((r: any) => r.tls).length === 0 && <p className="text-zinc-600 text-sm">No TLS routes configured</p>}
          </div>
        </div>
      </div>}

      {/* Entrypoints Tab */}
      {tab === 'Entrypoints' && <div className="space-y-3">
        {epArr.map((ep: any) => (
          <div key={ep.name} className="glass p-5">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <Activity size={18} className="text-brand" />
                <div>
                  <p className="font-bold uppercase">{ep.name}</p>
                  <p className="text-lg font-mono text-zinc-300">{ep.address}</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#34d399' }}><span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} /> Listening</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-zinc-800 rounded p-2"><span className="text-zinc-500">Read Timeout</span><p className="font-mono">{ep.transport?.respondingTimeouts?.readTimeout || 'default'}</p></div>
              <div className="bg-zinc-800 rounded p-2"><span className="text-zinc-500">Idle Timeout</span><p className="font-mono">{ep.transport?.respondingTimeouts?.idleTimeout || 'default'}</p></div>
              <div className="bg-zinc-800 rounded p-2"><span className="text-zinc-500">HTTP/2 Streams</span><p className="font-mono">{ep.http2?.maxConcurrentStreams || 250}</p></div>
              <div className="bg-zinc-800 rounded p-2"><span className="text-zinc-500">Max Headers</span><p className="font-mono">{ep.http?.maxHeaderBytes ? `${ep.http.maxHeaderBytes / 1024}KB` : 'default'}</p></div>
            </div>
          </div>
        ))}
      </div>}

      {/* Providers Tab */}
      {tab === 'Providers' && <div className="space-y-3">
        {ov?.providers && Object.entries(ov.providers).filter(([, v]) => v).map(([k]) => (
          <div key={k} className="glass p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10"><Eye size={20} className="text-emerald-400" /></div>
            <div>
              <p className="font-bold capitalize">{k}</p>
              <p className="text-xs text-zinc-500">Active • Auto-discovering services</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#34d399' }}><span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} /> Connected</span>
          </div>
        ))}
        <div className="glass p-5">
          <h3 className="font-semibold text-sm mb-2">Available Providers</h3>
          <p className="text-xs text-zinc-500">Docker, Swarm, Kubernetes, Consul, etcd, ZooKeeper, Redis, File, HTTP, ECS, Nomad</p>
          <p className="text-xs text-zinc-600 mt-2">Configure providers in the static config (traefik.yml)</p>
        </div>
      </div>}

      {/* Detail Modal */}
      {detail && (
        <Modal open={true} onClose={() => setDetail(null)} color="#2AA2C1">
          <h3 className="font-semibold text-lg mb-4" style={{ color: '#2AA2C1' }}>{detail.name}</h3>
          <div className="space-y-3">
            {detail.rule && <div><span className="text-xs text-zinc-500">Rule</span><p className="text-sm font-mono mt-1 p-2 rounded-lg" style={{ backgroundColor: '#09090b', color: '#34d399' }}>{detail.rule}</p></div>}
            {detail.service && <div><span className="text-xs text-zinc-500">Service</span><p className="text-sm mt-1">{detail.service}</p></div>}
            {detail.entryPoints && <div><span className="text-xs text-zinc-500">Entry Points</span><div className="flex gap-1 mt-1">{detail.entryPoints.map((ep: string) => <span key={ep} style={{ backgroundColor: '#3b82f618', color: '#60a5fa', borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{ep}</span>)}</div></div>}
            {detail.middlewares && <div><span className="text-xs text-zinc-500">Middlewares</span><div className="flex gap-1 mt-1 flex-wrap">{detail.middlewares.map((m: string) => <span key={m} style={{ backgroundColor: '#f9731618', color: '#fb923c', borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{m}</span>)}</div></div>}
            {detail.tls && <div><span className="text-xs text-zinc-500">TLS</span><p className="text-sm mt-1"><span style={{ backgroundColor: '#10b98118', color: '#34d399', borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Resolver: {detail.tls.certResolver || 'manual'}</span></p></div>}
            {detail.loadBalancer?.servers && <div><span className="text-xs text-zinc-500">Servers</span><div className="mt-1 space-y-1">{detail.loadBalancer.servers.map((s: any, i: number) => <p key={i} className="text-sm font-mono p-2 rounded-lg" style={{ backgroundColor: '#09090b' }}>{s.url}</p>)}</div></div>}
            {detail.loadBalancer?.healthCheck && <div><span className="text-xs text-zinc-500">Health Check</span><p className="text-sm mt-1">Path: {detail.loadBalancer.healthCheck.path} • Interval: {detail.loadBalancer.healthCheck.interval}</p></div>}
            {detail.type && <div><span className="text-xs text-zinc-500">Type</span><p className="text-sm mt-1"><TypeBadge type={detail.type} /></p></div>}
            <div><span className="text-xs text-zinc-500">Status</span><p className="text-sm mt-1"><StatusBadge status={detail.status} /></p></div>
            <div><span className="text-xs text-zinc-500">Provider</span><p className="text-sm mt-1">{detail.provider}</p></div>
            <details className="mt-4"><summary className="text-xs text-zinc-500 cursor-pointer">Raw JSON</summary><pre className="text-xs font-mono mt-2 p-3 rounded-lg overflow-auto max-h-60" style={{ backgroundColor: '#09090b', color: '#34d399' }}>{JSON.stringify(detail, null, 2)}</pre></details>
          </div>
        </Modal>
      )}
    </div>
  )
}
