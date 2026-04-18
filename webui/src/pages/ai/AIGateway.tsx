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

export function AIGateway() {
  const { data: middlewares } = useSWR('/http/middlewares')
  const { data: services } = useSWR('/http/services')

  const aiMiddlewares = Array.isArray(middlewares)
    ? middlewares.filter((m: any) => ['aigateway', 'semanticcache', 'piiguard', 'contentguard'].includes(m.type))
    : []
  const aiServices = Array.isArray(services)
    ? services.filter((s: any) => s.name?.includes('ai') || s.name?.includes('llm') || s.name?.includes('openai'))
    : []

  return (
    <Flex direction="column" gap={4}>
      <H2>AI Gateway</H2>

      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="AI Middlewares" value={String(aiMiddlewares.length)} subtitle="Gateway/Cache/Guard" />
        <StatCard title="AI Services" value={String(aiServices.length)} subtitle="LLM backends" />
        <StatCard title="Semantic Cache" value={aiMiddlewares.filter((m: any) => m.type === 'semanticcache').length > 0 ? 'Active' : 'Inactive'} />
        <StatCard title="PII Guard" value={aiMiddlewares.filter((m: any) => m.type === 'piiguard' || m.type === 'contentguard').length > 0 ? 'Active' : 'Inactive'} />
      </Grid>

      {aiMiddlewares.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Flex direction="column" gap={2}>
            <Text css={{ fontWeight: 600 }}>AI Middlewares</Text>
            {aiMiddlewares.map((m: any) => (
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

      {aiMiddlewares.length === 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>
            No AI Gateway middlewares configured. Add aigateway, semanticcache, or piiguard middlewares to your dynamic configuration.
          </Text>
        </Card>
      )}
    </Flex>
  )
}
