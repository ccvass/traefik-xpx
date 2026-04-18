import { Card, Flex, Grid, H2, Text, Badge } from '@traefik-labs/faency'
import PageTitle from 'layout/PageTitle'

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}>
    <Flex direction="column" gap={1}>
      <Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text>
      <Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>
      {subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}
    </Flex>
  </Card>
)

export const APIManagement = () => {
  return (
    <Flex direction="column" gap={6}>
      <PageTitle title="API Management" />

      <Grid gap={4} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <StatCard title="APIs" value="0" subtitle="Registered" />
        <StatCard title="Developers" value="0" subtitle="Portal users" />
        <StatCard title="API Keys" value="0" subtitle="Active" />
        <StatCard title="Config Issues" value="0" subtitle="Linter findings" />
      </Grid>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>API Catalog</H2>
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No APIs registered. Define APIs with versioning in the configuration.</Text>
        </Card>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Developer Portal</H2>
        <Card css={{ p: '$4' }}>
          <Flex justify="between" align="center">
            <Text>Self-service portal</Text>
            <Badge variant="gray">Not enabled</Badge>
          </Flex>
        </Card>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Traffic Debugger</H2>
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No traces captured. Enable the traffic debugger to inspect requests.</Text>
        </Card>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Event Correlation</H2>
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No correlated events. Events will appear when configuration changes or incidents occur.</Text>
        </Card>
      </Flex>
    </Flex>
  )
}

export default APIManagement
