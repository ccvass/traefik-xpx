import { Badge, Box, Button, Card, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import { useState } from 'react'
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi'
import useSWR, { mutate } from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

async function apiCall(method: string, path: string, body?: any) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  return fetch(`${API_BASE}${path}`, opts).then(r => r.json())
}

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}>
    <Flex direction="column" gap={1}>
      <Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text>
      <Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>
      {subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}
    </Flex>
  </Card>
)

function AddRateLimitForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [average, setAverage] = useState('100')
  const [burst, setBurst] = useState('50')

  const handleSave = async () => {
    if (!name) return
    await apiCall('PUT', `/config/http/middlewares/${name}`, {
      rateLimit: { average: parseInt(average), burst: parseInt(burst), period: '1s' }
    })
    mutate('/http/middlewares')
    onDone()
  }

  return (
    <Card css={{ p: '$3', border: '2px solid $colors$blue6' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New Rate Limiter</Text>
      <Flex gap={2} align="end">
        <Box css={{ flex: 2 }}>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Name</Text>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="my-rate-limit" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </Box>
        <Box css={{ flex: 1 }}>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Avg req/s</Text>
          <input value={average} onChange={e => setAverage(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </Box>
        <Box css={{ flex: 1 }}>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Burst</Text>
          <input value={burst} onChange={e => setBurst(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </Box>
        <Button size="small" onClick={handleSave} disabled={!name}><FiSave size={14} /> Save</Button>
      </Flex>
    </Card>
  )
}

function AddCacheForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [ttl, setTtl] = useState('300')
  const [maxEntries, setMaxEntries] = useState('5000')

  const handleSave = async () => {
    if (!name) return
    await apiCall('PUT', `/config/http/middlewares/${name}`, {
      httpCache: { defaultTtl: `${ttl}s`, maxEntries: parseInt(maxEntries) }
    })
    mutate('/http/middlewares')
    onDone()
  }

  return (
    <Card css={{ p: '$3', border: '2px solid $colors$green6' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New HTTP Cache</Text>
      <Flex gap={2} align="end">
        <Box css={{ flex: 2 }}>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Name</Text>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="my-cache" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </Box>
        <Box css={{ flex: 1 }}>
          <Text css={{ fontSize: '$2', mb: '$1' }}>TTL (seconds)</Text>
          <input value={ttl} onChange={e => setTtl(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </Box>
        <Box css={{ flex: 1 }}>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Max Entries</Text>
          <input value={maxEntries} onChange={e => setMaxEntries(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </Box>
        <Button size="small" onClick={handleSave} disabled={!name}><FiSave size={14} /> Save</Button>
      </Flex>
    </Card>
  )
}

function AddInFlightForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('100')

  const handleSave = async () => {
    if (!name) return
    await apiCall('PUT', `/config/http/middlewares/${name}`, {
      inFlightReq: { amount: parseInt(amount) }
    })
    mutate('/http/middlewares')
    onDone()
  }

  return (
    <Card css={{ p: '$3', border: '2px solid $colors$purple6' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>New In-Flight Limiter</Text>
      <Flex gap={2} align="end">
        <Box css={{ flex: 2 }}>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Name</Text>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="my-inflight" style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </Box>
        <Box css={{ flex: 1 }}>
          <Text css={{ fontSize: '$2', mb: '$1' }}>Max Concurrent</Text>
          <input value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
        </Box>
        <Button size="small" onClick={handleSave} disabled={!name}><FiSave size={14} /> Save</Button>
      </Flex>
    </Card>
  )
}

export function Distributed() {
  const { data: middlewares } = useSWR('/http/middlewares')
  const [showForm, setShowForm] = useState<'rateLimit' | 'cache' | 'inflight' | null>(null)

  const mws = Array.isArray(middlewares) ? middlewares : []
  const rateLimitMw = mws.filter((m: any) => m.type === 'ratelimit' || m.type === 'distributedratelimit')
  const cacheMw = mws.filter((m: any) => m.type === 'httpcache')
  const inflightMw = mws.filter((m: any) => m.type === 'inflightreq' || m.type === 'distributedInflightReq')

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    await apiCall('DELETE', `/config/http/middlewares/${name.replace(/@.*/, '')}`)
    mutate('/http/middlewares')
  }

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center">
        <H2>Distributed Features</H2>
      </Flex>

      <Grid columns={{ '@initial': 2, '@md': 3 }} gap={3}>
        <StatCard title="Rate Limiters" value={String(rateLimitMw.length)} subtitle="Active rate limit middlewares" />
        <StatCard title="HTTP Caches" value={String(cacheMw.length)} subtitle="Active cache middlewares" />
        <StatCard title="In-Flight Limiters" value={String(inflightMw.length)} subtitle="Concurrent request limiters" />
      </Grid>

      {/* Add buttons */}
      <Flex gap={2}>
        <Button size="small" onClick={() => setShowForm('rateLimit')}><FiPlus size={14} /> Add Rate Limiter</Button>
        <Button size="small" variant="secondary" onClick={() => setShowForm('cache')}><FiPlus size={14} /> Add HTTP Cache</Button>
        <Button size="small" variant="secondary" onClick={() => setShowForm('inflight')}><FiPlus size={14} /> Add In-Flight Limiter</Button>
      </Flex>

      {showForm === 'rateLimit' && <AddRateLimitForm onDone={() => setShowForm(null)} />}
      {showForm === 'cache' && <AddCacheForm onDone={() => setShowForm(null)} />}
      {showForm === 'inflight' && <AddInFlightForm onDone={() => setShowForm(null)} />}

      {/* Rate Limiters */}
      {rateLimitMw.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>Rate Limit Middlewares</Text>
          {rateLimitMw.map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$2', borderBottom: '1px solid $colors$gray3' }}>
              <Flex direction="column">
                <Text css={{ fontWeight: 500 }}>{m.name}</Text>
                <Text css={{ fontSize: '$2', color: '$textSubtle' }}>
                  {m.rateLimit?.average && `${m.rateLimit.average} req/s`}
                  {m.rateLimit?.burst && ` (burst: ${m.rateLimit.burst})`}
                  {m.rateLimit?.redis && ' [Redis]'}
                </Text>
              </Flex>
              <Flex gap={1} align="center">
                <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
                {m.provider === 'file' && <Button size="small" ghost variant="red" onClick={() => handleDelete(m.name)}><FiTrash2 size={12} /></Button>}
              </Flex>
            </Flex>
          ))}
        </Card>
      )}

      {/* HTTP Caches */}
      {cacheMw.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>HTTP Cache Middlewares</Text>
          {cacheMw.map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$2', borderBottom: '1px solid $colors$gray3' }}>
              <Text css={{ fontWeight: 500 }}>{m.name}</Text>
              <Flex gap={1} align="center">
                <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
                {m.provider === 'file' && <Button size="small" ghost variant="red" onClick={() => handleDelete(m.name)}><FiTrash2 size={12} /></Button>}
              </Flex>
            </Flex>
          ))}
        </Card>
      )}

      {/* In-Flight */}
      {inflightMw.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>In-Flight Request Limiters</Text>
          {inflightMw.map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$2', borderBottom: '1px solid $colors$gray3' }}>
              <Text css={{ fontWeight: 500 }}>{m.name}</Text>
              <Flex gap={1} align="center">
                <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
                {m.provider === 'file' && <Button size="small" ghost variant="red" onClick={() => handleDelete(m.name)}><FiTrash2 size={12} /></Button>}
              </Flex>
            </Flex>
          ))}
        </Card>
      )}

      {rateLimitMw.length === 0 && cacheMw.length === 0 && inflightMw.length === 0 && !showForm && (
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No distributed middlewares configured. Use the buttons above to add rate limiters, caches, or in-flight limiters.</Text>
        </Card>
      )}
    </Flex>
  )
}
