import { Badge, Button, Card, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import useSWR from 'swr'

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}><Flex direction="column" gap={1}><Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text><Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>{subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}</Flex></Card>
)

export function APIManagement() {
  const { data: routers } = useSWR('/http/routers')
  const { data: services } = useSWR('/http/services')
  const { data: middlewares } = useSWR('/http/middlewares')
  const totalR = Array.isArray(routers) ? routers.length : 0
  const totalS = Array.isArray(services) ? services.length : 0
  const totalM = Array.isArray(middlewares) ? middlewares.length : 0
  const fileR = Array.isArray(routers) ? routers.filter((r: any) => r.provider === 'file') : []

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center"><H2>API Management</H2><a href="#/config"><Button size="small">⚙️ Configure</Button></a></Flex>
      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="Total Routers" value={String(totalR)} subtitle="HTTP routes" />
        <StatCard title="Total Services" value={String(totalS)} subtitle="Backend services" />
        <StatCard title="Total Middlewares" value={String(totalM)} subtitle="Active middlewares" />
        <StatCard title="Managed APIs" value={String(fileR.length)} subtitle="File provider" />
      </Grid>
      {fileR.length > 0 && (
        <Card css={{ p: '$4' }}><Text css={{ fontWeight: 600, mb: '$2' }}>API Catalog (File Provider)</Text>
          {fileR.map((r: any) => (
            <Flex key={r.name} justify="between" align="center" css={{ py: '$1' }}>
              <Flex direction="column"><Text css={{ fontWeight: 500 }}>{r.name}</Text><Text css={{ fontSize: '$2', color: '$textSubtle' }}>{r.rule}</Text></Flex>
              <Badge variant={r.status === 'enabled' ? 'green' : 'red'}>{r.status}</Badge>
            </Flex>
          ))}
        </Card>
      )}
    </Flex>
  )
}
