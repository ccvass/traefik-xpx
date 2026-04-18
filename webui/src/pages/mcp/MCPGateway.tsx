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

export const MCPGateway = () => {
  return (
    <Flex direction="column" gap={6}>
      <PageTitle title="MCP Gateway" />

      <Grid gap={4} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <StatCard title="MCP Servers" value="0" subtitle="Registered" />
        <StatCard title="Active Sessions" value="0" />
        <StatCard title="Tool Invocations" value="0" subtitle="Last 24h" />
        <StatCard title="Policy Denials" value="0" subtitle="Last 24h" />
      </Grid>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Server Registry</H2>
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No MCP servers registered. Configure servers in the MCP gateway settings.</Text>
        </Card>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>TBAC Policies</H2>
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No task-based access control policies configured.</Text>
        </Card>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Audit Log</H2>
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No audit events recorded.</Text>
        </Card>
      </Flex>
    </Flex>
  )
}

export default MCPGateway
