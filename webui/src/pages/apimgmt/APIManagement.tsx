import { Badge, Button, Card, Flex, Grid, H2, Text, TextField } from '@traefik-labs/faency'
import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import useSWR from 'swr'

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

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}>
    <Flex direction="column" gap={1}>
      <Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text>
      <Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>
      {subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}
    </Flex>
  </Card>
)

export function APIManagement() {
  const { data: routers } = useSWR('/http/routers')
  const { data: services } = useSWR('/http/services')
  const { data: middlewares } = useSWR('/http/middlewares')
  const { data: apimgmtConfig, mutate: mutateConfig } = useSWR('apimgmt-config', () => fetchSection('apiMgmt'))

  const [portalTitle, setPortalTitle] = useState('')
  const [portalPath, setPortalPath] = useState('')
  const [saved, setSaved] = useState(false)

  // Initialize form from config
  if (apimgmtConfig?.portal && !portalTitle && !saved) {
    setPortalTitle(apimgmtConfig.portal.title || '')
    setPortalPath(apimgmtConfig.portal.basePath || '/portal')
  }

  const totalRouters = Array.isArray(routers) ? routers.length : 0
  const totalServices = Array.isArray(services) ? services.length : 0
  const totalMiddlewares = Array.isArray(middlewares) ? middlewares.length : 0
  const fileRouters = Array.isArray(routers) ? routers.filter((r: any) => r.provider === 'file') : []

  const handleSavePortal = async () => {
    await saveSection('apiMgmt', {
      ...apimgmtConfig,
      portal: { enabled: true, title: portalTitle, basePath: portalPath },
    })
    mutateConfig()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Flex direction="column" gap={4}>
      <H2>API Management</H2>

      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="Total Routers" value={String(totalRouters)} subtitle="HTTP routes" />
        <StatCard title="Total Services" value={String(totalServices)} subtitle="Backend services" />
        <StatCard title="Total Middlewares" value={String(totalMiddlewares)} subtitle="Active middlewares" />
        <StatCard title="APIs (File)" value={String(fileRouters.length)} subtitle="Managed APIs" />
      </Grid>

      <Card css={{ p: '$4' }}>
        <Text css={{ fontWeight: 600, mb: '$3' }}>Developer Portal Settings</Text>
        <Flex direction="column" gap={2}>
          <TextField label="Portal Title" value={portalTitle} onChange={(e: any) => setPortalTitle(e.target.value)} placeholder="My API Portal" />
          <TextField label="Base Path" value={portalPath} onChange={(e: any) => setPortalPath(e.target.value)} placeholder="/portal" />
          <Flex justify="end" gap={2}>
            {saved && <Text css={{ color: '$green9', fontSize: '$2' }}>Saved! Restart required.</Text>}
            <Button size="small" onClick={handleSavePortal}><FiSave size={14} /> Save Portal Config</Button>
          </Flex>
        </Flex>
      </Card>

      {fileRouters.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>API Catalog (File Provider)</Text>
          {fileRouters.map((r: any) => (
            <Flex key={r.name} justify="between" align="center" css={{ py: '$1' }}>
              <Flex direction="column">
                <Text>{r.name}</Text>
                <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{r.rule}</Text>
              </Flex>
              <Badge variant={r.status === 'enabled' ? 'green' : 'red'}>{r.status}</Badge>
            </Flex>
          ))}
        </Card>
      )}
    </Flex>
  )
}
