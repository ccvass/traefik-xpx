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

export function MCPGateway() {
  const { data: middlewares } = useSWR('/http/middlewares')
  const { data: services } = useSWR('/http/services')

  const mcpMiddlewares = Array.isArray(middlewares)
    ? middlewares.filter((m: any) => ['tbac', 'mcpgovernance', 'mcppolicy', 'mcpaudit'].includes(m.type))
    : []
  const mcpServices = Array.isArray(services)
    ? services.filter((s: any) => s.name?.includes('mcp'))
    : []

  return (
    <Flex direction="column" gap={4}>
      <H2>MCP Gateway</H2>

      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="MCP Middlewares" value={String(mcpMiddlewares.length)} subtitle="TBAC/Governance/Policy/Audit" />
        <StatCard title="MCP Services" value={String(mcpServices.length)} subtitle="MCP server backends" />
        <StatCard title="TBAC Engine" value={mcpMiddlewares.filter((m: any) => m.type === 'tbac').length > 0 ? 'Active' : 'Inactive'} />
        <StatCard title="Audit Logger" value={mcpMiddlewares.filter((m: any) => m.type === 'mcpaudit').length > 0 ? 'Active' : 'Inactive'} />
      </Grid>

      {mcpMiddlewares.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Flex direction="column" gap={2}>
            <Text css={{ fontWeight: 600 }}>MCP Middlewares</Text>
            {mcpMiddlewares.map((m: any) => (
              <Flex key={m.name} justify="between" align="center">
                <Text>{m.name}</Text>
                <Flex gap={1}>
                  <Badge>{m.type}</Badge>
                  <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Card>
      )}

      {mcpMiddlewares.length === 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>
            No MCP Gateway middlewares configured. Add tbac, mcpgovernance, mcppolicy, or mcpaudit middlewares to your dynamic configuration.
          </Text>
        </Card>
      )}
    </Flex>
  )
}
