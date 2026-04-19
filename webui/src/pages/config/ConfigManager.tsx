import { Box, Button, Card, Flex, H2, H3, Text, TextField } from '@traefik-labs/faency'
import { useState } from 'react'
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi'
import useSWR, { mutate } from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

async function apiCall(method: string, path: string, body?: any) {
  const opts: RequestInit = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  return fetch(`${API_BASE}${path}`, opts).then(r => r.json())
}

async function fetchStatic(section: string) {
  const res = await fetch(`${API_BASE}/config/static?section=${section}`, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

async function saveStatic(section: string, data: any) {
  return fetch(`${API_BASE}/config/static?section=${section}`, {
    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })
}

function mutateAll() {
  mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares')
}

// ─── Tab Button ─────────────────────────────────────────────────────────────

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      css={{
        px: '$3', py: '$2', cursor: 'pointer', fontWeight: active ? 600 : 400,
        borderBottom: active ? '2px solid $blue9' : '2px solid transparent',
        color: active ? '$blue9' : '$textSubtle', fontSize: '$3',
        '&:hover': { color: '$blue9' },
      }}
    >{label}</Box>
  )
}

// ─── Generic Resource List ──────────────────────────────────────────────────

function ResourceList({ items, onDelete }: { items: any[]; onDelete: (name: string) => void }) {
  if (!items.length) return <Text css={{ color: '$textSubtle', py: '$2' }}>No resources configured. Use the form above to create one.</Text>
  return (
    <Flex direction="column" gap={1}>
      {items.map((item: any) => {
        const isEditable = item.provider === 'file'
        return (
          <Flex key={item.name} justify="between" align="center" css={{
            py: '$2', px: '$3', borderRadius: '$1',
            border: isEditable ? '1px solid $colors$blue4' : '1px solid $colors$gray4',
            background: isEditable ? '$blue1' : '$gray1',
          }}>
            <Flex direction="column" gap={0}>
              <Flex gap={2} align="center">
                <Text css={{ fontWeight: 500 }}>{item.name}</Text>
                {item.type && <Text css={{ fontSize: '$1', color: '$textSubtle', background: '$gray3', px: '$1', borderRadius: '$1' }}>{item.type}</Text>}
                {!isEditable && <Text css={{ fontSize: '$1', color: '$textSubtle', fontStyle: 'italic' }}>read-only</Text>}
              </Flex>
              {item.rule && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{item.rule}</Text>}
            </Flex>
            {isEditable && (
              <Button size="small" ghost variant="red" onClick={() => { if (confirm(`Delete "${item.name}"?`)) onDelete(item.name.replace(/@.*/, '')) }}>
                <FiTrash2 size={14} />
              </Button>
            )}
          </Flex>
        )
      })}
    </Flex>
  )
}

// ─── Proxy Tab ──────────────────────────────────────────────────────────────

function ProxyTab() {
  const { data: routers } = useSWR('/http/routers')
  const { data: services } = useSWR('/http/services')
  const { data: middlewares } = useSWR('/http/middlewares')
  const [form, setForm] = useState<'router' | 'service' | 'middleware' | null>(null)

  return (
    <Flex direction="column" gap={4}>
      <Flex gap={2}>
        <Button size="small" onClick={() => setForm('router')}><FiPlus size={14} /> Add Router</Button>
        <Button size="small" variant="secondary" onClick={() => setForm('service')}><FiPlus size={14} /> Add Service</Button>
        <Button size="small" variant="secondary" onClick={() => setForm('middleware')}><FiPlus size={14} /> Add Middleware</Button>
      </Flex>

      {form === 'router' && <RouterForm onDone={() => setForm(null)} />}
      {form === 'service' && <ServiceForm onDone={() => setForm(null)} />}
      {form === 'middleware' && <MiddlewareForm onDone={() => setForm(null)} />}

      <H3>Routers</H3>
      <ResourceList items={Array.isArray(routers) ? routers : []} onDelete={n => { apiCall('DELETE', `/config/http/routers/${n}`).then(mutateAll) }} />

      <H3>Services</H3>
      <ResourceList items={Array.isArray(services) ? services : []} onDelete={n => { apiCall('DELETE', `/config/http/services/${n}`).then(mutateAll) }} />

      <H3>Middlewares</H3>
      <ResourceList items={Array.isArray(middlewares) ? middlewares : []} onDelete={n => { apiCall('DELETE', `/config/http/middlewares/${n}`).then(mutateAll) }} />
    </Flex>
  )
}

function RouterForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState(''); const [rule, setRule] = useState(''); const [service, setService] = useState(''); const [eps, setEps] = useState('web'); const [mws, setMws] = useState('')
  const save = async () => {
    if (!name || !rule || !service) return
    const cfg: any = { rule, service, entryPoints: eps.split(',').map(s => s.trim()) }
    if (mws) cfg.middlewares = mws.split(',').map(s => s.trim())
    await apiCall('PUT', `/config/http/routers/${name}`, cfg); mutateAll(); onDone()
  }
  return (
    <Card css={{ p: '$3', borderLeft: '3px solid $colors$blue9' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New Router</Text>
      <Flex direction="column" gap={2}>
        <Flex gap={2}><TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. my-api-router" css={{ flex: 1 }} /><TextField label="Service" value={service} onChange={(e: any) => setService(e.target.value)} placeholder="e.g. backend-api" css={{ flex: 1 }} /></Flex>
        <Text css={{ fontSize: '$1', color: '$textSubtle', mt: '-$1' }}>Name must be unique. Service must match an existing service name.</Text>
        <TextField label="Rule" value={rule} onChange={(e: any) => setRule(e.target.value)} placeholder="e.g. Host(`app.example.com`) && PathPrefix(`/api`)" />
        <Flex gap={2}><TextField label="Entry Points (comma-separated)" value={eps} onChange={(e: any) => setEps(e.target.value)} css={{ flex: 1 }} /><TextField label="Middlewares" value={mws} onChange={(e: any) => setMws(e.target.value)} placeholder="e.g. auth,rate-limit" css={{ flex: 1 }} /></Flex>
        <Text css={{ fontSize: '$1', color: '$textSubtle', mt: '-$1' }}>Entry points: web (HTTP), websecure (HTTPS). Middlewares: comma-separated names.</Text>
        <Flex gap={2} justify="end"><Button size="small" variant="secondary" onClick={onDone}>Cancel</Button><Button size="small" onClick={save} disabled={!name || !rule || !service}><FiSave size={14} /> Create</Button></Flex>
      </Flex>
    </Card>
  )
}

function ServiceForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState(''); const [urls, setUrls] = useState('http://127.0.0.1:8080'); const [health, setHealth] = useState('/health')
  const save = async () => {
    if (!name) return
    const servers = urls.split('\n').filter(Boolean).map(u => ({ url: u.trim() }))
    const cfg: any = { loadBalancer: { servers } }
    if (health) cfg.loadBalancer.healthCheck = { path: health, interval: '10s' }
    await apiCall('PUT', `/config/http/services/${name}`, cfg); mutateAll(); onDone()
  }
  return (
    <Card css={{ p: '$3', borderLeft: '3px solid $colors$purple9' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New Service</Text>
      <Flex direction="column" gap={2}>
        <TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. my-backend" />
        <Text css={{ fontSize: '$1', color: '$textSubtle', mt: '-$1' }}>Unique name for this service. Used in router configuration.</Text>
        <Box><Text css={{ fontSize: '$2', mb: '$1' }}>Backend URLs (one per line)</Text><textarea value={urls} onChange={e => setUrls(e.target.value)} style={{ width: '100%', minHeight: 60, fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} /></Box>
        <TextField label="Health Check Path" value={health} onChange={(e: any) => setHealth(e.target.value)} />
        <Flex gap={2} justify="end"><Button size="small" variant="secondary" onClick={onDone}>Cancel</Button><Button size="small" onClick={save} disabled={!name}><FiSave size={14} /> Create</Button></Flex>
      </Flex>
    </Card>
  )
}

function MiddlewareForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState(''); const [type, setType] = useState('apiKey')
  const templates: Record<string, any> = {
    apiKey: { apiKey: { headerName: 'X-API-Key', keys: [{ value: 'your-key', metadata: 'user' }] } },
    rateLimit: { rateLimit: { average: 100, burst: 50, period: '1s' } },
    waf: { waf: { inlineRules: 'SecRuleEngine On\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"' } },
    jwtAuth: { jwtAuth: { jwksUrl: 'https://auth.example.com/.well-known/jwks.json', issuer: 'https://auth.example.com' } },
    oidc: { oidc: { issuerUrl: 'https://accounts.google.com', clientId: 'your-id', clientSecret: 'secret', redirectUrl: 'https://app/callback' } },
    hmac: { hmac: { secret: 'shared-secret', algorithm: 'sha256', headerName: 'X-Signature' } },
    httpCache: { httpCache: { defaultTtl: '300s', maxEntries: 5000 } },
    apiMock: { apiMock: { specFile: '/etc/traefik/specs/api.yaml', defaultStatus: 200 } },
    inFlightReq: { inFlightReq: { amount: 100 } },
    basicAuth: { basicAuth: { users: ['admin:$apr1$hash'] } },
  }
  const [json, setJson] = useState(JSON.stringify(templates[type], null, 2))
  const changeType = (t: string) => { setType(t); setJson(JSON.stringify(templates[t] || {}, null, 2)) }
  const save = async () => {
    if (!name) return
    try { await apiCall('PUT', `/config/http/middlewares/${name}`, JSON.parse(json)); mutateAll(); onDone() } catch {}
  }
  return (
    <Card css={{ p: '$3', borderLeft: '3px solid $colors$green9' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New Middleware</Text>
      <Flex direction="column" gap={2}>
        <Flex gap={2}>
          <TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. my-auth" css={{ flex: 1 }} />
          <Box css={{ flex: 1 }}><Text css={{ fontSize: '$2', mb: '$1' }}>Type</Text>
            <select value={type} onChange={e => changeType(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="apiKey">🔑 API Key Authentication</option><option value="rateLimit">⚡ Rate Limiting</option><option value="waf">🛡️ WAF (Coraza Firewall)</option>
              <option value="jwtAuth">🔐 JWT Authentication</option><option value="oidc">🔓 OpenID Connect</option><option value="hmac">✍️ HMAC Signature</option>
              <option value="httpCache">💾 HTTP Cache</option><option value="apiMock">🎭 API Mock (OpenAPI)</option><option value="inFlightReq">🚦 In-Flight Request Limit</option>
              <option value="basicAuth">👤 Basic Auth</option>
            </select>
          </Box>
        </Flex>
        <Text css={{ fontSize: '$1', color: '$textSubtle', mt: '-$1' }}>Select a type to auto-fill the configuration template below. Edit values as needed.</Text>
        <Box><Text css={{ fontSize: '$2', mb: '$1' }}>Configuration (JSON)</Text><textarea value={json} onChange={e => setJson(e.target.value)} style={{ width: '100%', minHeight: 120, fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} /></Box>
        <Flex gap={2} justify="end"><Button size="small" variant="secondary" onClick={onDone}>Cancel</Button><Button size="small" onClick={save} disabled={!name}><FiSave size={14} /> Create</Button></Flex>
      </Flex>
    </Card>
  )
}

// ─── AI Tab ─────────────────────────────────────────────────────────────────

function AITab() {
  const { data: cfg, mutate: m } = useSWR('ai-cfg', () => fetchStatic('ai'))
  const [show, setShow] = useState(false)
  const providers = cfg?.providers || []
  const save = async (providers: any[]) => { await saveStatic('ai', { ...cfg, providers }); m() }
  const remove = (i: number) => save(providers.filter((_: any, j: number) => j !== i))
  const add = (p: any) => { save([...providers, p]); setShow(false) }

  return (
    <Flex direction="column" gap={3}>
      <Flex justify="between" align="center"><Text css={{ fontWeight: 600 }}>LLM Providers</Text><Button size="small" onClick={() => setShow(true)}><FiPlus size={14} /> Add Provider</Button></Flex>
      {show && <ProviderForm onSave={add} onCancel={() => setShow(false)} />}
      {providers.map((p: any, i: number) => (
        <Flex key={i} justify="between" align="center" css={{ py: '$2', px: '$3', border: '1px solid $colors$blue4', borderRadius: '$1', background: '$blue1' }}>
          <Flex direction="column"><Text css={{ fontWeight: 500 }}>{p.name}</Text><Text css={{ fontSize: '$2', color: '$textSubtle' }}>{p.type} — {p.endpoint}</Text></Flex>
          <Button size="small" ghost variant="red" onClick={() => remove(i)}><FiTrash2 size={14} /></Button>
        </Flex>
      ))}
      {!providers.length && !show && <Text css={{ color: '$textSubtle' }}>No AI providers configured.</Text>}
    </Flex>
  )
}

function ProviderForm({ onSave, onCancel }: { onSave: (p: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(''); const [type, setType] = useState('openai'); const [endpoint, setEndpoint] = useState(''); const [models, setModels] = useState('')
  return (
    <Card css={{ p: '$3', borderLeft: '3px solid $colors$blue9' }}>
      <Flex direction="column" gap={2}>
        <Flex gap={2}><TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} css={{ flex: 1 }} /><Box css={{ flex: 1 }}><Text css={{ fontSize: '$2', mb: '$1' }}>Provider Type</Text><select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="ollama">Ollama (Local)</option><option value="azure">Azure OpenAI</option><option value="mistral">Mistral AI</option></select></Box></Flex>
        <TextField label="Endpoint" value={endpoint} onChange={(e: any) => setEndpoint(e.target.value)} placeholder="e.g. https://api.openai.com/v1" />
        <TextField label="Models (comma-sep)" value={models} onChange={(e: any) => setModels(e.target.value)} placeholder="e.g. gpt-4, gpt-3.5-turbo, claude-3-opus" />
        <Flex gap={2} justify="end"><Button size="small" variant="secondary" onClick={onCancel}>Cancel</Button><Button size="small" onClick={() => onSave({ name, type, endpoint, models: models.split(',').map(s => s.trim()).filter(Boolean) })} disabled={!name || !endpoint}><FiSave size={14} /> Save</Button></Flex>
      </Flex>
    </Card>
  )
}

// ─── MCP Tab ────────────────────────────────────────────────────────────────

function MCPTab() {
  const { data: cfg, mutate: m } = useSWR('mcp-cfg', () => fetchStatic('mcp'))
  const [showServer, setShowServer] = useState(false); const [showPolicy, setShowPolicy] = useState(false)
  const servers = cfg?.servers || []; const policies = cfg?.policies || []
  const saveS = async (s: any[]) => { await saveStatic('mcp', { ...cfg, servers: s }); m() }
  const saveP = async (p: any[]) => { await saveStatic('mcp', { ...cfg, policies: p }); m() }

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center"><Text css={{ fontWeight: 600 }}>MCP Servers</Text><Button size="small" onClick={() => setShowServer(true)}><FiPlus size={14} /> Add Server</Button></Flex>
      {showServer && <Card css={{ p: '$3', borderLeft: '3px solid $colors$blue9' }}><SimpleForm fields={[{l:'Name',k:'name'},{l:'Endpoint',k:'endpoint'},{l:'Protocol',k:'protocol',d:'stdio',opts:['stdio','http','sse']}]} onSave={v => { saveS([...servers, v]); setShowServer(false) }} onCancel={() => setShowServer(false)} /></Card>}
      {servers.map((s: any, i: number) => (
        <Flex key={i} justify="between" align="center" css={{ py: '$2', px: '$3', border: '1px solid $colors$blue4', borderRadius: '$1', background: '$blue1' }}>
          <Flex direction="column"><Text css={{ fontWeight: 500 }}>{s.name}</Text><Text css={{ fontSize: '$2', color: '$textSubtle' }}>{s.protocol} — {s.endpoint}</Text></Flex>
          <Button size="small" ghost variant="red" onClick={() => saveS(servers.filter((_: any, j: number) => j !== i))}><FiTrash2 size={14} /></Button>
        </Flex>
      ))}
      {!servers.length && !showServer && <Text css={{ color: '$textSubtle' }}>No MCP servers configured.</Text>}

      <Flex justify="between" align="center"><Text css={{ fontWeight: 600 }}>Policies</Text><Button size="small" onClick={() => setShowPolicy(true)}><FiPlus size={14} /> Add Policy</Button></Flex>
      {showPolicy && <Card css={{ p: '$3', borderLeft: '3px solid $colors$green9' }}><SimpleForm fields={[{l:'Name',k:'name'},{l:'Action',k:'action',d:'allow',opts:['allow','deny','audit','rateLimit']},{l:'Priority',k:'priority',d:'0'}]} onSave={v => { saveP([...policies, {...v, priority: parseInt(v.priority)||0}]); setShowPolicy(false) }} onCancel={() => setShowPolicy(false)} /></Card>}
      {policies.map((p: any, i: number) => (
        <Flex key={i} justify="between" align="center" css={{ py: '$2', px: '$3', border: '1px solid $colors$green4', borderRadius: '$1', background: '$green1' }}>
          <Flex direction="column"><Text css={{ fontWeight: 500 }}>{p.name}</Text><Text css={{ fontSize: '$2', color: '$textSubtle' }}>{p.action} (priority: {p.priority})</Text></Flex>
          <Button size="small" ghost variant="red" onClick={() => saveP(policies.filter((_: any, j: number) => j !== i))}><FiTrash2 size={14} /></Button>
        </Flex>
      ))}
      {!policies.length && !showPolicy && <Text css={{ color: '$textSubtle' }}>No policies configured.</Text>}
    </Flex>
  )
}

function SimpleForm({ fields, onSave, onCancel }: { fields: {l:string,k:string,d?:string,opts?:string[]}[]; onSave: (v: any) => void; onCancel: () => void }) {
  const [vals, setVals] = useState<Record<string,string>>(Object.fromEntries(fields.map(f => [f.k, f.d || ''])))
  return (
    <Flex direction="column" gap={2}>
      <Flex gap={2} wrap="wrap">{fields.map(f => f.opts ? <Box key={f.k} css={{ flex: 1, minWidth: 120 }}><Text css={{ fontSize: '$2', mb: '$1' }}>{f.l}</Text><select value={vals[f.k]} onChange={e => setVals({...vals, [f.k]: e.target.value})} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>{f.opts.map((o: string) => <option key={o} value={o}>{o}</option>)}</select></Box> : <TextField key={f.k} label={f.l} value={vals[f.k]} onChange={(e: any) => setVals({...vals, [f.k]: e.target.value})} css={{ flex: 1, minWidth: 120 }} />)}</Flex>
      <Flex gap={2} justify="end"><Button size="small" variant="secondary" onClick={onCancel}>Cancel</Button><Button size="small" onClick={() => onSave(vals)}><FiSave size={14} /> Save</Button></Flex>
    </Flex>
  )
}

// ─── Operations Tab ─────────────────────────────────────────────────────────

function OpsTab() {
  const [status, setStatus] = useState('')
  const reload = async () => { await apiCall('POST', '/reload'); setStatus('Reload triggered'); setTimeout(() => setStatus(''), 3000) }
  return (
    <Flex direction="column" gap={3}>
      <Card css={{ p: '$4' }}>
        <H3>System Operations</H3>
        <Flex gap={3} css={{ mt: '$3' }}>
          <Button onClick={reload}>🔄 Reload Config</Button>
          <Button variant="secondary" onClick={() => window.open(`${API_BASE}/config/backup`, '_blank')}>📥 Download Backup</Button>
        </Flex>
        {status && <Text css={{ mt: '$2', color: '$green9' }}>✓ {status}</Text>}
      </Card>
    </Flex>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────

const TABS = ['Proxy', 'Security', 'AI Gateway', 'MCP Gateway', 'Operations'] as const
type TabName = typeof TABS[number]

export function ConfigManager() {
  const [tab, setTab] = useState<TabName>('Proxy')

  return (
    <Flex direction="column" gap={4}>
      <H2>Configuration Manager</H2>
      <Text css={{ color: '$textSubtle' }}>All configuration in one place. Changes to proxy config apply immediately. AI/MCP changes require reload.</Text>

      <Flex css={{ borderBottom: '1px solid $colors$gray4' }}>
        {TABS.map(t => <Tab key={t} active={tab === t} label={t} onClick={() => setTab(t)} />)}
      </Flex>

      {tab === 'Proxy' && <ProxyTab />}
      {tab === 'Security' && <ProxyTab />}
      {tab === 'AI Gateway' && <AITab />}
      {tab === 'MCP Gateway' && <MCPTab />}
      {tab === 'Operations' && <OpsTab />}
    </Flex>
  )
}
