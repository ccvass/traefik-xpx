import { Badge, Box, Button, Card, Flex, H2, H3, Text, TextField } from '@traefik-labs/faency'
import { useCallback, useState } from 'react'
import { FiCheck, FiDownload, FiPlus, FiRefreshCw, FiSave, FiTrash2, FiUpload } from 'react-icons/fi'
import useSWR, { mutate } from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

async function apiCall(method: string, path: string, body?: any) {
  const opts: RequestInit = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  return res.json()
}

async function fetchStatic(section: string) {
  const res = await fetch(`${API_BASE}/config/static?section=${section}`)
  if (!res.ok) return null
  return res.json()
}

async function saveStatic(section: string, data: any) {
  return fetch(`${API_BASE}/config/static?section=${section}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button
      size="small"
      variant={active ? 'primary' : 'secondary'}
      onClick={onClick}
      css={{ borderRadius: '$1', fontWeight: active ? 600 : 400 }}
    >
      {label}
    </Button>
  )
}

// ─── Router Form ────────────────────────────────────────────────────────────

function RouterForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('')
  const [rule, setRule] = useState('')
  const [service, setService] = useState('')
  const [entryPoints, setEntryPoints] = useState('web')
  const [middlewares, setMiddlewares] = useState('')

  const handleSave = async () => {
    if (!name || !rule || !service) return
    const config: any = { rule, service, entryPoints: entryPoints.split(',').map(s => s.trim()) }
    if (middlewares) config.middlewares = middlewares.split(',').map(s => s.trim())
    await apiCall('PUT', `/config/http/routers/${name}`, config)
    mutate('/http/routers')
    setName(''); setRule(''); setService(''); setMiddlewares('')
    onSave()
  }

  return (
    <Card css={{ p: '$3', border: '2px solid $colors$blue6' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New Router</Text>
      <Flex direction="column" gap={2}>
        <Flex gap={2}>
          <TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="my-router" css={{ flex: 1 }} />
          <TextField label="Service" value={service} onChange={(e: any) => setService(e.target.value)} placeholder="my-service" css={{ flex: 1 }} />
        </Flex>
        <TextField label="Rule" value={rule} onChange={(e: any) => setRule(e.target.value)} placeholder="Host(`app.example.com`) && PathPrefix(`/api`)" />
        <Flex gap={2}>
          <TextField label="Entry Points (comma-sep)" value={entryPoints} onChange={(e: any) => setEntryPoints(e.target.value)} css={{ flex: 1 }} />
          <TextField label="Middlewares (comma-sep)" value={middlewares} onChange={(e: any) => setMiddlewares(e.target.value)} placeholder="auth,rate-limit" css={{ flex: 1 }} />
        </Flex>
        <Flex justify="end"><Button size="small" onClick={handleSave} disabled={!name || !rule || !service}><FiSave size={14} /> Create Router</Button></Flex>
      </Flex>
    </Card>
  )
}

// ─── Middleware Form ────────────────────────────────────────────────────────

function MiddlewareForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('apiKey')
  const [config, setConfig] = useState('')

  const templates: Record<string, any> = {
    apiKey: { apiKey: { headerName: 'X-API-Key', keys: [{ value: 'your-key', metadata: 'user' }] } },
    rateLimit: { rateLimit: { average: 100, burst: 50, period: '1s' } },
    waf: { waf: { inlineRules: 'SecRuleEngine On\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"' } },
    jwt: { jwtAuth: { jwksUrl: 'https://auth.example.com/.well-known/jwks.json', issuer: 'https://auth.example.com' } },
    oidc: { oidc: { issuerUrl: 'https://accounts.google.com', clientId: 'your-client-id', clientSecret: 'secret', redirectUrl: 'https://app.example.com/callback' } },
    hmac: { hmac: { secret: 'shared-secret', algorithm: 'sha256', headerName: 'X-Signature' } },
    httpCache: { httpCache: { defaultTtl: '300s', maxEntries: 5000 } },
    apiMock: { apiMock: { specFile: '/etc/traefik/specs/api.yaml', defaultStatus: 200 } },
  }

  const handleTypeChange = (t: string) => {
    setType(t)
    setConfig(JSON.stringify(templates[t] || {}, null, 2))
  }

  const handleSave = async () => {
    if (!name) return
    try {
      const parsed = JSON.parse(config)
      await apiCall('PUT', `/config/http/middlewares/${name}`, parsed)
      mutate('/http/middlewares')
      setName('')
      onSave()
    } catch {}
  }

  return (
    <Card css={{ p: '$3', border: '2px solid $colors$green6' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New Middleware</Text>
      <Flex direction="column" gap={2}>
        <Flex gap={2}>
          <TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="my-middleware" css={{ flex: 1 }} />
          <Box css={{ flex: 1 }}>
            <Text css={{ fontSize: '$2', mb: '$1' }}>Type</Text>
            <select value={type} onChange={(e) => handleTypeChange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="apiKey">API Key</option>
              <option value="rateLimit">Rate Limit</option>
              <option value="waf">WAF (Coraza)</option>
              <option value="jwt">JWT Auth</option>
              <option value="oidc">OIDC</option>
              <option value="hmac">HMAC</option>
              <option value="httpCache">HTTP Cache</option>
              <option value="apiMock">API Mock</option>
            </select>
          </Box>
        </Flex>
        <Box>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Configuration</Text>
          <textarea
            value={config || JSON.stringify(templates[type], null, 2)}
            onChange={(e) => setConfig(e.target.value)}
            style={{ width: '100%', minHeight: 150, fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
        </Box>
        <Flex justify="end"><Button size="small" onClick={handleSave} disabled={!name}><FiSave size={14} /> Create Middleware</Button></Flex>
      </Flex>
    </Card>
  )
}

// ─── Service Form ───────────────────────────────────────────────────────────

function ServiceForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('')
  const [servers, setServers] = useState('http://127.0.0.1:8080')
  const [healthPath, setHealthPath] = useState('/health')

  const handleSave = async () => {
    if (!name || !servers) return
    const urls = servers.split('\n').filter(Boolean).map(url => ({ url: url.trim() }))
    const config: any = { loadBalancer: { servers: urls } }
    if (healthPath) config.loadBalancer.healthCheck = { path: healthPath, interval: '10s' }
    await apiCall('PUT', `/config/http/services/${name}`, config)
    mutate('/http/services')
    setName(''); setServers('http://127.0.0.1:8080')
    onSave()
  }

  return (
    <Card css={{ p: '$3', border: '2px solid $colors$purple6' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New Service</Text>
      <Flex direction="column" gap={2}>
        <TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="my-service" />
        <Box>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Backend URLs (one per line)</Text>
          <textarea
            value={servers}
            onChange={(e) => setServers(e.target.value)}
            style={{ width: '100%', minHeight: 80, fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
        </Box>
        <TextField label="Health Check Path" value={healthPath} onChange={(e: any) => setHealthPath(e.target.value)} />
        <Flex justify="end"><Button size="small" onClick={handleSave} disabled={!name}><FiSave size={14} /> Create Service</Button></Flex>
      </Flex>
    </Card>
  )
}

// ─── Resource List ──────────────────────────────────────────────────────────

function ResourceList({ type, data }: { type: string; data: any[] }) {
  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    await apiCall('DELETE', `/config/http/${type}/${name.replace(/@.*/, '')}`)
    mutate(`/http/${type}`)
  }

  return (
    <Card css={{ p: '$3' }}>
      <Text css={{ fontWeight: 600, mb: '$2', textTransform: 'capitalize' }}>Active {type} ({data.length})</Text>
      {data.map((item: any) => (
        <Flex key={item.name} justify="between" align="center" css={{ py: '$1', borderBottom: '1px solid $colors$gray3' }}>
          <Flex direction="column">
            <Text css={{ fontWeight: 500 }}>{item.name}</Text>
            <Text css={{ fontSize: '$1', color: '$textSubtle' }}>
              {item.rule || item.type || (item.loadBalancer && `${item.loadBalancer.servers?.length || 0} servers`)}
            </Text>
          </Flex>
          <Flex gap={1} align="center">
            {item.type && <Badge css={{ fontSize: '$1' }}>{item.type}</Badge>}
            <Badge variant={item.status === 'enabled' ? 'green' : 'red'} css={{ fontSize: '$1' }}>{item.status}</Badge>
            {item.provider === 'file' && (
              <Button size="small" ghost variant="red" onClick={() => handleDelete(item.name)}><FiTrash2 size={12} /></Button>
            )}
          </Flex>
        </Flex>
      ))}
      {data.length === 0 && <Text css={{ color: '$textSubtle', fontSize: '$2' }}>None configured</Text>}
    </Card>
  )
}

// ─── Operations Tab ─────────────────────────────────────────────────────────

function OperationsTab() {
  const [reloadStatus, setReloadStatus] = useState('')
  const [backupUrl, setBackupUrl] = useState('')

  const handleReload = async () => {
    const res = await apiCall('POST', '/reload')
    setReloadStatus(res.status || 'triggered')
    setTimeout(() => setReloadStatus(''), 3000)
  }

  const handleBackup = () => {
    window.open(`${API_BASE}/config/backup`, '_blank')
  }

  return (
    <Flex direction="column" gap={3}>
      <Card css={{ p: '$4' }}>
        <H3>Reload & Backup</H3>
        <Flex gap={3} css={{ mt: '$3' }}>
          <Button onClick={handleReload}>
            <FiRefreshCw size={14} /> Reload Static Config
          </Button>
          <Button variant="secondary" onClick={handleBackup}>
            <FiDownload size={14} /> Download Backup
          </Button>
        </Flex>
        {reloadStatus && <Text css={{ mt: '$2', color: '$green9' }}><FiCheck size={12} /> {reloadStatus}</Text>}
      </Card>
    </Flex>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ConfigManager() {
  const { data: routers } = useSWR('/http/routers')
  const { data: services } = useSWR('/http/services')
  const { data: middlewares } = useSWR('/http/middlewares')

  const [tab, setTab] = useState<'routers' | 'middlewares' | 'services' | 'operations'>('routers')
  const [showForm, setShowForm] = useState(false)

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center">
        <H2>Configuration Manager</H2>
        <Button size="small" onClick={() => setShowForm(!showForm)}>
          <FiPlus size={14} /> {showForm ? 'Hide Form' : 'Create New'}
        </Button>
      </Flex>

      <Flex gap={2}>
        <TabButton active={tab === 'routers'} label="Routers" onClick={() => setTab('routers')} />
        <TabButton active={tab === 'middlewares'} label="Middlewares" onClick={() => setTab('middlewares')} />
        <TabButton active={tab === 'services'} label="Services" onClick={() => setTab('services')} />
        <TabButton active={tab === 'operations'} label="Operations" onClick={() => setTab('operations')} />
      </Flex>

      {showForm && tab === 'routers' && <RouterForm onSave={() => setShowForm(false)} />}
      {showForm && tab === 'middlewares' && <MiddlewareForm onSave={() => setShowForm(false)} />}
      {showForm && tab === 'services' && <ServiceForm onSave={() => setShowForm(false)} />}

      {tab === 'routers' && <ResourceList type="routers" data={Array.isArray(routers) ? routers : []} />}
      {tab === 'middlewares' && <ResourceList type="middlewares" data={Array.isArray(middlewares) ? middlewares : []} />}
      {tab === 'services' && <ResourceList type="services" data={Array.isArray(services) ? services : []} />}
      {tab === 'operations' && <OperationsTab />}
    </Flex>
  )
}
