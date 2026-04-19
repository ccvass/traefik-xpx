import { Button, Card, Flex, Grid, H2, H3, Text, TextField } from '@traefik-labs/faency'
import { useState } from 'react'
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi'
import useSWR from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

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

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}><Flex direction="column" gap={1}><Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text><Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>{subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}</Flex></Card>
)

function ClusterForm({ onSave, onCancel }: { onSave: (c: any) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [region, setRegion] = useState('')

  return (
    <Card css={{ p: '$3', borderLeft: '3px solid $colors$blue9' }}>
      <Text css={{ fontWeight: 600, mb: '$2' }}>Add Cluster Instance</Text>
      <Flex direction="column" gap={2}>
        <TextField label="Instance Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. production-us-east" />
        <Text css={{ fontSize: '$1', color: '$textSubtle', mt: '-$1' }}>A unique name to identify this Traefik instance</Text>

        <TextField label="API URL" value={url} onChange={(e: any) => setUrl(e.target.value)} placeholder="e.g. https://traefik-node2.example.com:8099" />
        <Text css={{ fontSize: '$1', color: '$textSubtle', mt: '-$1' }}>Full URL to the instance's API endpoint (including port)</Text>

        <TextField label="Region / Zone" value={region} onChange={(e: any) => setRegion(e.target.value)} placeholder="e.g. us-east-1, eu-west-1, on-premise" />
        <Text css={{ fontSize: '$1', color: '$textSubtle', mt: '-$1' }}>Datacenter region or availability zone</Text>

        <Flex gap={2} justify="end">
          <Button size="small" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button size="small" onClick={() => onSave({ name, url, region })} disabled={!name || !url}><FiSave size={14} /> Add Instance</Button>
        </Flex>
      </Flex>
    </Card>
  )
}

export function Clusters() {
  const { data: overview } = useSWR('/overview')
  const { data: entrypoints } = useSWR('/entrypoints')
  const { data: version } = useSWR('/version')
  const { data: clusterCfg, mutate: mutateClusters } = useSWR('cluster-cfg', () => fetchStatic('clusters'))

  const [showAdd, setShowAdd] = useState(false)

  const instances = clusterCfg?.instances || []
  const httpRouters = overview?.http?.routers?.total || 0
  const httpServices = overview?.http?.services?.total || 0
  const totalMw = (overview?.http?.middlewares?.total || 0)

  const handleAdd = async (instance: any) => {
    const updated = [...instances, { ...instance, addedAt: new Date().toISOString() }]
    await saveStatic('clusters', { ...clusterCfg, instances: updated })
    mutateClusters()
    setShowAdd(false)
  }

  const handleRemove = async (index: number) => {
    if (!confirm(`Remove instance "${instances[index].name}"?`)) return
    const updated = instances.filter((_: any, i: number) => i !== index)
    await saveStatic('clusters', { ...clusterCfg, instances: updated })
    mutateClusters()
  }

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center">
        <H2>Multi-Cluster Overview</H2>
        <Button size="small" onClick={() => setShowAdd(true)}><FiPlus size={14} /> Add Instance</Button>
      </Flex>

      {showAdd && <ClusterForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />}

      {/* Current Instance */}
      <Card css={{ p: '$4', borderLeft: '3px solid $colors$green9' }}>
        <Flex justify="between" align="center" css={{ mb: '$3' }}>
          <Flex direction="column">
            <Text css={{ fontWeight: 600, fontSize: '$4' }}>Current Instance (this node)</Text>
            <Text css={{ color: '$textSubtle', fontSize: '$2' }}>Version: {version?.Version || 'dev'}</Text>
          </Flex>
          <Text css={{ color: '$green9', fontWeight: 600 }}>● Healthy</Text>
        </Flex>
        <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
          <StatCard title="HTTP Routers" value={String(httpRouters)} />
          <StatCard title="HTTP Services" value={String(httpServices)} />
          <StatCard title="Middlewares" value={String(totalMw)} />
          <StatCard title="Entry Points" value={String(Array.isArray(entrypoints) ? entrypoints.length : 0)} />
        </Grid>
        {Array.isArray(entrypoints) && (
          <Flex gap={2} wrap="wrap" css={{ mt: '$3' }}>
            {entrypoints.map((ep: any) => (
              <Text key={ep.name} css={{ fontSize: '$2', background: '$gray3', px: '$2', py: '$1', borderRadius: '$1' }}>
                {ep.name}: {ep.address}
              </Text>
            ))}
          </Flex>
        )}
      </Card>

      {/* Remote Instances */}
      {instances.length > 0 && <H3>Remote Instances</H3>}
      {instances.map((inst: any, i: number) => (
        <Card key={i} css={{ p: '$4', borderLeft: '3px solid $colors$blue9' }}>
          <Flex justify="between" align="center">
            <Flex direction="column">
              <Text css={{ fontWeight: 600, fontSize: '$4' }}>{inst.name}</Text>
              <Text css={{ color: '$textSubtle', fontSize: '$2' }}>{inst.url}</Text>
              {inst.region && <Text css={{ color: '$textSubtle', fontSize: '$2' }}>Region: {inst.region}</Text>}
            </Flex>
            <Flex gap={2} align="center">
              <Text css={{ color: '$blue9', fontSize: '$2' }}>○ Registered</Text>
              <Button size="small" ghost variant="red" onClick={() => handleRemove(i)}><FiTrash2 size={14} /></Button>
            </Flex>
          </Flex>
        </Card>
      ))}

      {instances.length === 0 && !showAdd && (
        <Card css={{ p: '$4', border: '1px dashed $colors$gray6' }}>
          <Flex direction="column" align="center" gap={2} css={{ py: '$4' }}>
            <Text css={{ fontSize: '$4' }}>🌐</Text>
            <Text css={{ fontWeight: 600 }}>No remote instances registered</Text>
            <Text css={{ color: '$textSubtle', textAlign: 'center', maxWidth: 400 }}>
              Click "Add Instance" to register other traefik-api-srv nodes. This allows you to monitor multiple instances from a single dashboard.
            </Text>
          </Flex>
        </Card>
      )}
    </Flex>
  )
}
