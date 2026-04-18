import { Badge, Button, Card, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import { useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
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

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}>
    <Flex direction="column" gap={1}>
      <Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text>
      <Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>
      {subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}
    </Flex>
  </Card>
)

export function Security() {
  const { data: middlewares } = useSWR('/http/middlewares')

  const wafMiddlewares = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'waf') : []
  const apiKeyMiddlewares = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'apikey') : []
  const authMiddlewares = Array.isArray(middlewares)
    ? middlewares.filter((m: any) => ['basicauth', 'digestauth', 'forwardauth', 'jwt', 'oidc', 'oauth2introspection', 'hmac', 'ldap'].includes(m.type))
    : []
  const opaMiddlewares = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'opa') : []

  const handleAddWaf = async () => {
    const name = prompt('WAF middleware name:')
    if (!name) return
    const rules = prompt('SecRules (inline):', 'SecRuleEngine On')
    await apiCall('PUT', `/config/http/middlewares/${name}`, { waf: { inlineRules: rules } })
    mutate('/http/middlewares')
  }

  const handleAddApiKey = async () => {
    const name = prompt('API Key middleware name:')
    if (!name) return
    const key = prompt('API Key value:')
    const header = prompt('Header name:', 'X-API-Key')
    await apiCall('PUT', `/config/http/middlewares/${name}`, { apiKey: { headerName: header, keys: [{ value: key, metadata: 'user' }] } })
    mutate('/http/middlewares')
  }

  const handleDelete = async (mwName: string) => {
    if (!confirm(`Delete middleware "${mwName}"?`)) return
    const cleanName = mwName.replace(/@.*/, '')
    await apiCall('DELETE', `/config/http/middlewares/${cleanName}`)
    mutate('/http/middlewares')
  }

  return (
    <Flex direction="column" gap={4}>
      <H2>Security</H2>

      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="WAF Rules" value={String(wafMiddlewares.length)} subtitle="Active WAF middlewares" />
        <StatCard title="API Key Auth" value={String(apiKeyMiddlewares.length)} subtitle="API key middlewares" />
        <StatCard title="Auth Methods" value={String(authMiddlewares.length)} subtitle="JWT/OIDC/LDAP/OAuth/HMAC" />
        <StatCard title="OPA Policies" value={String(opaMiddlewares.length)} subtitle="Policy decision points" />
      </Grid>

      <Card css={{ p: '$4' }}>
        <Flex justify="between" align="center" css={{ mb: '$3' }}>
          <Text css={{ fontWeight: 600 }}>WAF Middlewares</Text>
          <Button size="small" onClick={handleAddWaf}><FiPlus size={14} /> Add WAF</Button>
        </Flex>
        {wafMiddlewares.map((m: any) => (
          <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}>
            <Text>{m.name}</Text>
            <Flex gap={1}>
              <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
              {m.provider === 'file' && <Button size="small" ghost onClick={() => handleDelete(m.name)}><FiTrash2 size={12} /></Button>}
            </Flex>
          </Flex>
        ))}
        {wafMiddlewares.length === 0 && <Text css={{ color: '$textSubtle' }}>No WAF middlewares configured.</Text>}
      </Card>

      <Card css={{ p: '$4' }}>
        <Flex justify="between" align="center" css={{ mb: '$3' }}>
          <Text css={{ fontWeight: 600 }}>API Key Middlewares</Text>
          <Button size="small" onClick={handleAddApiKey}><FiPlus size={14} /> Add API Key</Button>
        </Flex>
        {apiKeyMiddlewares.map((m: any) => (
          <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}>
            <Text>{m.name}</Text>
            <Flex gap={1}>
              <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
              {m.provider === 'file' && <Button size="small" ghost onClick={() => handleDelete(m.name)}><FiTrash2 size={12} /></Button>}
            </Flex>
          </Flex>
        ))}
        {apiKeyMiddlewares.length === 0 && <Text css={{ color: '$textSubtle' }}>No API Key middlewares configured.</Text>}
      </Card>

      {authMiddlewares.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>Authentication Middlewares</Text>
          {authMiddlewares.map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}>
              <Text>{m.name}</Text>
              <Flex gap={1}>
                <Badge>{m.type}</Badge>
                <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
              </Flex>
            </Flex>
          ))}
        </Card>
      )}
    </Flex>
  )
}
