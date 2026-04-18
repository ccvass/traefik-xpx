import { Card, Flex, Grid, H2, Text, Badge } from '@traefik-labs/faency'
import PageTitle from 'layout/PageTitle'

const providers = [
  { name: 'OpenAI', type: 'openai', status: 'healthy' },
  { name: 'Anthropic', type: 'anthropic', status: 'healthy' },
  { name: 'Ollama', type: 'ollama', status: 'unknown' },
  { name: 'Mistral', type: 'mistral', status: 'unknown' },
  { name: 'Azure OpenAI', type: 'azure', status: 'unknown' },
]

const StatusBadge = ({ status }: { status: string }) => {
  const color = status === 'healthy' ? 'green' : status === 'unhealthy' ? 'red' : 'gray'
  return <Badge variant={color}>{status}</Badge>
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

export const AIGateway = () => {
  return (
    <Flex direction="column" gap={6}>
      <PageTitle title="AI Gateway" />

      <Grid gap={4} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <StatCard title="Total Requests" value="0" subtitle="Last 24h" />
        <StatCard title="Tokens Used" value="0" subtitle="Prompt + Completion" />
        <StatCard title="Cache Hit Rate" value="—" subtitle="Semantic cache" />
        <StatCard title="Estimated Cost" value="$0.00" subtitle="Last 24h" />
      </Grid>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Providers</H2>
        <Grid gap={4} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {providers.map((p) => (
            <Card key={p.name} css={{ p: '$4' }}>
              <Flex direction="column" gap={2}>
                <Flex justify="between" align="center">
                  <Text css={{ fontWeight: 600 }}>{p.name}</Text>
                  <StatusBadge status={p.status} />
                </Flex>
                <Text css={{ fontSize: '$2', color: '$textSubtle' }}>Type: {p.type}</Text>
              </Flex>
            </Card>
          ))}
        </Grid>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Credentials</H2>
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No credentials configured. Add AI provider credentials in the static configuration.</Text>
        </Card>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Content Guard</H2>
        <Grid gap={4} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <StatCard title="PII Detections" value="0" subtitle="Last 24h" />
          <StatCard title="Injection Blocks" value="0" subtitle="Prompt injection" />
          <StatCard title="Redactions" value="0" subtitle="Auto-redacted" />
        </Grid>
      </Flex>
    </Flex>
  )
}

export default AIGateway
