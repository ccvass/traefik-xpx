import { Badge, Box, Button, Card, Dialog, DialogContent, DialogTitle, Flex, H2, Text, TextField } from '@traefik-labs/faency'
import { useCallback, useState } from 'react'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import useSWR, { mutate } from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

async function apiCall(method: string, path: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

function ResourceEditor({ type, name, value, onClose }: { type: string; name?: string; value?: any; onClose: () => void }) {
  const [resourceName, setResourceName] = useState(name || '')
  const [json, setJson] = useState(value ? JSON.stringify(value, null, 2) : '{\n  \n}')
  const [error, setError] = useState('')

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(json)
      await apiCall('PUT', `/config/http/${type}/${resourceName}`, parsed)
      mutate('/http/routers')
      mutate('/http/services')
      mutate('/http/middlewares')
      onClose()
    } catch (e: any) {
      setError(e.message || 'Invalid JSON')
    }
  }

  return (
    <Flex direction="column" gap={3} css={{ p: '$2' }}>
      <TextField
        label="Name"
        value={resourceName}
        onChange={(e: any) => setResourceName(e.target.value)}
        disabled={!!name}
        placeholder="my-router"
      />
      <Box>
        <Text css={{ fontSize: '$2', mb: '$1' }}>Configuration (JSON)</Text>
        <textarea
          value={json}
          onChange={(e) => { setJson(e.target.value); setError('') }}
          style={{ width: '100%', minHeight: 200, fontFamily: 'monospace', fontSize: 13, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
      </Box>
      {error && <Text css={{ color: '$red9', fontSize: '$2' }}>{error}</Text>}
      <Flex gap={2} justify="end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!resourceName}>Save</Button>
      </Flex>
    </Flex>
  )
}

function ResourceTable({ type, data }: { type: string; data: any[] }) {
  const [editing, setEditing] = useState<{ name: string; value: any } | null>(null)
  const [creating, setCreating] = useState(false)

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete ${type.slice(0, -1)} "${name}"?`)) return
    await apiCall('DELETE', `/config/http/${type}/${name}`)
    mutate('/http/routers')
    mutate('/http/services')
    mutate('/http/middlewares')
  }

  const fileItems = data.filter((item: any) => item.provider === 'file')

  return (
    <Card css={{ p: '$4' }}>
      <Flex justify="between" align="center" css={{ mb: '$3' }}>
        <Text css={{ fontWeight: 600, textTransform: 'capitalize' }}>{type}</Text>
        <Button size="small" onClick={() => setCreating(true)}>
          <FiPlus size={14} /> Create
        </Button>
      </Flex>

      {data.map((item: any) => (
        <Flex key={item.name} justify="between" align="center" css={{ py: '$2', borderBottom: '1px solid $colors$gray4' }}>
          <Flex direction="column" gap={1}>
            <Text css={{ fontWeight: 500 }}>{item.name}</Text>
            {item.rule && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{item.rule}</Text>}
            {item.type && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>Type: {item.type}</Text>}
          </Flex>
          <Flex gap={1} align="center">
            <Badge variant={item.status === 'enabled' ? 'green' : 'red'}>{item.status}</Badge>
            {item.provider === 'file' && (
              <>
                <Button size="small" ghost onClick={() => setEditing({ name: item.name.replace(/@.*/, ''), value: item })}>
                  <FiEdit2 size={14} />
                </Button>
                <Button size="small" ghost onClick={() => handleDelete(item.name.replace(/@.*/, ''))}>
                  <FiTrash2 size={14} />
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      ))}

      {data.length === 0 && <Text css={{ color: '$textSubtle' }}>No {type} configured</Text>}

      <Dialog open={!!editing || creating} onOpenChange={() => { setEditing(null); setCreating(false) }}>
        <DialogContent css={{ maxWidth: 500 }}>
          <DialogTitle>{editing ? `Edit ${type.slice(0, -1)}` : `Create ${type.slice(0, -1)}`}</DialogTitle>
          <ResourceEditor
            type={type}
            name={editing?.name}
            value={editing?.value}
            onClose={() => { setEditing(null); setCreating(false) }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function ConfigManager() {
  const { data: routers } = useSWR('/http/routers')
  const { data: services } = useSWR('/http/services')
  const { data: middlewares } = useSWR('/http/middlewares')

  return (
    <Flex direction="column" gap={4}>
      <H2>Configuration Manager</H2>
      <Text css={{ color: '$textSubtle' }}>Create, edit, and delete dynamic configuration. Changes are applied immediately via hot-reload.</Text>

      <ResourceTable type="routers" data={Array.isArray(routers) ? routers : []} />
      <ResourceTable type="services" data={Array.isArray(services) ? services : []} />
      <ResourceTable type="middlewares" data={Array.isArray(middlewares) ? middlewares : []} />
    </Flex>
  )
}
