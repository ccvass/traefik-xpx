import { Card, Flex, Grid, H2, Text, Badge } from '@traefik-labs/faency'
import useSWR from 'swr'

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

  const totalRouters = Array.isArray(routers) ? routers.length : 0
  const totalServices = Array.isArray(services) ? services.length : 0
  const totalMiddlewares = Array.isArray(middlewares) ? middlewares.length : 0
  const versioningMiddlewares = Array.isArray(middlewares)
    ? middlewares.filter((m: any) => m.type === 'apiversioning')
    : []

  const fileRouters = Array.isArray(routers) ? routers.filter((r: any) => r.provider === 'file') : []

  return (
    <Flex direction="column" gap={4}>
      <H2>API Management</H2>

      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="Total Routers" value={String(totalRouters)} subtitle="HTTP routes" />
        <StatCard title="Total Services" value={String(totalServices)} subtitle="Backend services" />
        <StatCard title="Total Middlewares" value={String(totalMiddlewares)} subtitle="Active middlewares" />
        <StatCard title="API Versioning" value={String(versioningMiddlewares.length)} subtitle="Version routers" />
      </Grid>

      {fileRouters.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Flex direction="column" gap={2}>
            <Text css={{ fontWeight: 600 }}>API Catalog (File Provider)</Text>
            {fileRouters.map((r: any) => (
              <Flex key={r.name} justify="between" align="center">
                <Flex direction="column">
                  <Text>{r.name}</Text>
                  <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{r.rule}</Text>
                </Flex>
                <Flex gap={1}>
                  <Badge variant={r.status === 'enabled' ? 'green' : 'red'}>{r.status}</Badge>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Card>
      )}
    </Flex>
  )
}
