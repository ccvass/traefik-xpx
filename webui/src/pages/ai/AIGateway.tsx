import { Badge, Box, Button, Card, Flex, H2, Text, TextField } from '@traefik-labs/faency'
import { useState } from 'react'
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi'
import useSWR, { mutate } from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

async function fetchSection(section: string) {
  const res = await fetch(`${API_BASE}/config/static?section=${section}`)
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

function ProviderForm({ provider, onSave, onRemove }: { provider?: any; onSave: (p: any) => void; onRemove?: () => void }) {
  const [name, setName] = useState(provider?.name || '')
  const [type, setType] = useState(provider?.type || 'openai')
  const [endpoint, setEndpoint] = useState(provider?.endpoint || '')
  const [models, setModels] = useState(provider?.models?.join(', ') || '')

  return (
    <Card css={{ p: '$3', mb: '$2' }}>
      <Flex direction="column" gap={2}>
        <Flex gap={2}>
          <TextField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} css={{ flex: 1 }} />
          <TextField label="Type" value={type} onChange={(e: any) => setType(e.target.value)} css={{ flex: 1 }} />
        </Flex>
        <TextField label="Endpoint" value={endpoint} onChange={(e: any) => setEndpoint(e.target.value)} />
        <TextField label="Models (comma-separated)" value={models} onChange={(e: any) => setModels(e.target.value)} />
        <Flex gap={2} justify="end">
          {onRemove && <Button size="small" variant="red" onClick={onRemove}><FiTrash2 size={12} /> Remove</Button>}
          <Button size="small" onClick={() => onSave({ name, type, endpoint, models: models.split(',').map((m: string) => m.trim()).filter(Boolean) })}>
            <FiSave size={12} /> Save
          </Button>
        </Flex>
      </Flex>
    </Card>
  )
}

export function AIGateway() {
  const { data: aiConfig, mutate: mutateAI } = useSWR('ai-config', () => fetchSection('ai'))
  const { data: middlewares } = useSWR('/http/middlewares')

  const [showAdd, setShowAdd] = useState(false)

  const providers = aiConfig?.providers || []

  const aiMiddlewares = Array.isArray(middlewares)
    ? middlewares.filter((m: any) => ['aigateway', 'semanticcache', 'piiguard', 'contentguard'].includes(m.type))
    : []

  const handleSaveProvider = async (index: number, provider: any) => {
    const updated = [...providers]
    updated[index] = provider
    await saveSection('ai', { ...aiConfig, providers: updated })
    mutateAI()
  }

  const handleAddProvider = async (provider: any) => {
    const updated = [...providers, provider]
    await saveSection('ai', { ...aiConfig, providers: updated })
    mutateAI()
    setShowAdd(false)
  }

  const handleRemoveProvider = async (index: number) => {
    const updated = providers.filter((_: any, i: number) => i !== index)
    await saveSection('ai', { ...aiConfig, providers: updated })
    mutateAI()
  }

  return (
    <Flex direction="column" gap={4}>
      <H2>AI Gateway</H2>

      <Card css={{ p: '$4' }}>
        <Flex justify="between" align="center" css={{ mb: '$3' }}>
          <Text css={{ fontWeight: 600 }}>LLM Providers</Text>
          <Button size="small" onClick={() => setShowAdd(true)}><FiPlus size={14} /> Add Provider</Button>
        </Flex>

        {providers.map((p: any, i: number) => (
          <ProviderForm
            key={i}
            provider={p}
            onSave={(updated) => handleSaveProvider(i, updated)}
            onRemove={() => handleRemoveProvider(i)}
          />
        ))}

        {providers.length === 0 && !showAdd && (
          <Text css={{ color: '$textSubtle' }}>No AI providers configured. Click "Add Provider" to get started.</Text>
        )}

        {showAdd && <ProviderForm onSave={handleAddProvider} />}
      </Card>

      {aiMiddlewares.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>Active AI Middlewares</Text>
          {aiMiddlewares.map((m: any) => (
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
