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

export function Clusters() {
  const { data: overview } = useSWR('/overview')
  const { data: entrypoints } = useSWR('/entrypoints')
  const { data: version } = useSWR('/version')

  const httpRouters = overview?.http?.routers?.total || 0
  const httpServices = overview?.http?.services?.total || 0
  const tcpRouters = overview?.tcp?.routers?.total || 0
  const udpRouters = overview?.udp?.routers?.total || 0

  return (
    <Flex direction="column" gap={4}>
      <H2>Multi-Cluster Overview</H2>

      <Card css={{ p: '$4' }}>
        <Flex justify="between" align="center" css={{ mb: '$3' }}>
          <Flex direction="column">
            <Text css={{ fontWeight: 600, fontSize: '$5' }}>Current Instance</Text>
            <Text css={{ color: '$textSubtle' }}>{version?.Version || 'unknown'}</Text>
          </Flex>
          <Badge variant="green" size="large">Healthy</Badge>
        </Flex>

        <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
          <StatCard title="HTTP Routers" value={String(httpRouters)} />
          <StatCard title="HTTP Services" value={String(httpServices)} />
          <StatCard title="TCP Routers" value={String(tcpRouters)} />
          <StatCard title="UDP Routers" value={String(udpRouters)} />
        </Grid>
      </Card>

      {Array.isArray(entrypoints) && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>Entry Points</Text>
          {entrypoints.map((ep: any) => (
            <Flex key={ep.name} justify="between" align="center" css={{ py: '$1' }}>
              <Flex direction="column">
                <Text css={{ fontWeight: 500 }}>{ep.name}</Text>
                <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{ep.address}</Text>
              </Flex>
              <Badge variant="green">listening</Badge>
            </Flex>
          ))}
        </Card>
      )}

      <Card css={{ p: '$4', border: '1px dashed $colors$gray6' }}>
        <Text css={{ color: '$textSubtle', textAlign: 'center' }}>
          Additional cluster instances will appear here when multi-instance discovery is configured.
          Configure the &quot;clusters&quot; section in your static config to register remote instances.
        </Text>
      </Card>
    </Flex>
  )
}
