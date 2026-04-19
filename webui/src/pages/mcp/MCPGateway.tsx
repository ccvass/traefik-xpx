import { Badge, Button, Card, Flex, H2, Text, TextField } from '@traefik-labs/faency'
import { useState } from 'react'
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi'
import useSWR from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

async function fetchSection(section: string) {
  const res = await fetch(`${API_BASE}/config/static?section=${section}`, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

async function saveSection(section: string, data: any) {
  await fetch(`${API_BASE}/config/static?section=${section}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

function ServerForm({ server, onSave, onRemove }: { server?: any; onSave: (s: any) => void; onRemove?: () => void }) {
  const [name, setName] = useState(server?.name || '')
  const [endpoint, setEndpoint] = useState(server?.endpoint || '')
  const [protocol, setProtocol] = useState(server?.protocol || 'stdio')

  return (
    <Card css={{ p: '$3', mb: '$2' }}>
      <Flex direction="column" gap={2}>
        <Flex gap={2}>
          <TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} css={{ flex: 1 }} />
          <TextField label="Protocol" value={protocol} onChange={(e: any) => setProtocol(e.target.value)} css={{ flex: 1 }} />
        </Flex>
        <TextField label="Endpoint" value={endpoint} onChange={(e: any) => setEndpoint(e.target.value)} />
        <Flex gap={2} justify="end">
          {onRemove && <Button size="small" variant="red" onClick={onRemove}><FiTrash2 size={12} /> Remove</Button>}
          <Button size="small" onClick={() => onSave({ name, endpoint, protocol })}><FiSave size={12} /> Save</Button>
        </Flex>
      </Flex>
    </Card>
  )
}

function PolicyForm({ policy, onSave, onRemove }: { policy?: any; onSave: (p: any) => void; onRemove?: () => void }) {
  const [name, setName] = useState(policy?.name || '')
  const [action, setAction] = useState(policy?.action || 'allow')
  const [priority, setPriority] = useState(String(policy?.priority || 0))

  return (
    <Card css={{ p: '$3', mb: '$2' }}>
      <Flex gap={2}>
        <TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} css={{ flex: 2 }} />
        <TextField label="Action" value={action} onChange={(e: any) => setAction(e.target.value)} css={{ flex: 1 }} />
        <TextField label="Priority" value={priority} onChange={(e: any) => setPriority(e.target.value)} css={{ flex: 1 }} />
      </Flex>
      <Flex gap={2} justify="end" css={{ mt: '$2' }}>
        {onRemove && <Button size="small" variant="red" onClick={onRemove}><FiTrash2 size={12} /></Button>}
        <Button size="small" onClick={() => onSave({ name, action, priority: parseInt(priority) || 0 })}><FiSave size={12} /></Button>
      </Flex>
    </Card>
  )
}

export function MCPGateway() {
  const { data: mcpConfig, mutate: mutateMCP } = useSWR('mcp-config', () => fetchSection('mcp'))
  const { data: middlewares } = useSWR('/http/middlewares')

  const [showAddServer, setShowAddServer] = useState(false)
  const [showAddPolicy, setShowAddPolicy] = useState(false)

  const servers = mcpConfig?.servers || []
  const policies = mcpConfig?.policies || []

  const mcpMiddlewares = Array.isArray(middlewares)
    ? middlewares.filter((m: any) => ['tbac', 'mcpgovernance', 'mcppolicy', 'mcpaudit'].includes(m.type))
    : []

  const handleSaveServer = async (index: number, server: any) => {
    const updated = [...servers]; updated[index] = server
    await saveSection('mcp', { ...mcpConfig, servers: updated }); mutateMCP()
  }
  const handleAddServer = async (server: any) => {
    await saveSection('mcp', { ...mcpConfig, servers: [...servers, server] }); mutateMCP(); setShowAddServer(false)
  }
  const handleRemoveServer = async (index: number) => {
    await saveSection('mcp', { ...mcpConfig, servers: servers.filter((_: any, i: number) => i !== index) }); mutateMCP()
  }
  const handleSavePolicy = async (index: number, policy: any) => {
    const updated = [...policies]; updated[index] = policy
    await saveSection('mcp', { ...mcpConfig, policies: updated }); mutateMCP()
  }
  const handleAddPolicy = async (policy: any) => {
    await saveSection('mcp', { ...mcpConfig, policies: [...policies, policy] }); mutateMCP(); setShowAddPolicy(false)
  }
  const handleRemovePolicy = async (index: number) => {
    await saveSection('mcp', { ...mcpConfig, policies: policies.filter((_: any, i: number) => i !== index) }); mutateMCP()
  }

  return (
    <Flex direction="column" gap={4}>
      <H2>MCP Gateway</H2>

      <Card css={{ p: '$4' }}>
        <Flex justify="between" align="center" css={{ mb: '$3' }}>
          <Text css={{ fontWeight: 600 }}>MCP Servers</Text>
          <Button size="small" onClick={() => setShowAddServer(true)}><FiPlus size={14} /> Add Server</Button>
        </Flex>
        {servers.map((s: any, i: number) => (
          <ServerForm key={i} server={s} onSave={(u) => handleSaveServer(i, u)} onRemove={() => handleRemoveServer(i)} />
        ))}
        {servers.length === 0 && !showAddServer && <Text css={{ color: '$textSubtle' }}>No MCP servers configured.</Text>}
        {showAddServer && <ServerForm onSave={handleAddServer} />}
      </Card>

      <Card css={{ p: '$4' }}>
        <Flex justify="between" align="center" css={{ mb: '$3' }}>
          <Text css={{ fontWeight: 600 }}>Policies</Text>
          <Button size="small" onClick={() => setShowAddPolicy(true)}><FiPlus size={14} /> Add Policy</Button>
        </Flex>
        {policies.map((p: any, i: number) => (
          <PolicyForm key={i} policy={p} onSave={(u) => handleSavePolicy(i, u)} onRemove={() => handleRemovePolicy(i)} />
        ))}
        {policies.length === 0 && !showAddPolicy && <Text css={{ color: '$textSubtle' }}>No policies configured.</Text>}
        {showAddPolicy && <PolicyForm onSave={handleAddPolicy} />}
      </Card>

      {mcpMiddlewares.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>Active MCP Middlewares</Text>
          {mcpMiddlewares.map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}>
              <Text>{m.name}</Text>
              <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.type}</Badge>
            </Flex>
          ))}
        </Card>
      )}
    </Flex>
  )
}
