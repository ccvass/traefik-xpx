import { Badge, Button, Card, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import useSWR from 'swr'

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}><Flex direction="column" gap={1}><Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text><Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>{subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}</Flex></Card>
)

export function MCPGateway() {
  const { data: middlewares } = useSWR('/http/middlewares')
  const mws = Array.isArray(middlewares) ? middlewares : []
  const mcpMws = mws.filter((m: any) => ['tbac', 'mcpgovernance', 'mcppolicy', 'mcpaudit'].includes(m.type))

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center"><H2>MCP Gateway</H2><a href="#/config"><Button size="small">⚙️ Configure</Button></a></Flex>
      <Grid columns={{ '@initial': 2, '@md': 3 }} gap={3}>
        <StatCard title="MCP Middlewares" value={String(mcpMws.length)} subtitle="TBAC/Governance/Policy/Audit" />
        <StatCard title="TBAC Engine" value={mcpMws.some((m: any) => m.type === 'tbac') ? 'Active' : 'Inactive'} />
        <StatCard title="Audit Logger" value={mcpMws.some((m: any) => m.type === 'mcpaudit') ? 'Active' : 'Inactive'} />
      </Grid>
      {mcpMws.length > 0 && (
        <Card css={{ p: '$4' }}><Text css={{ fontWeight: 600, mb: '$2' }}>Active MCP Middlewares</Text>
          {mcpMws.map((m: any) => <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}><Text>{m.name}</Text><Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.type}</Badge></Flex>)}
        </Card>
      )}
      {mcpMws.length === 0 && <Card css={{ p: '$4' }}><Text css={{ color: '$textSubtle' }}>No MCP middlewares active. <a href="#/config">Go to Config Manager → MCP Gateway tab</a> to add servers and policies.</Text></Card>}
    </Flex>
  )
}
