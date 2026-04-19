import { Badge, Button, Card, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import useSWR from 'swr'

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}><Flex direction="column" gap={1}><Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text><Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>{subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}</Flex></Card>
)

export function AIGateway() {
  const { data: middlewares } = useSWR('/http/middlewares')
  const mws = Array.isArray(middlewares) ? middlewares : []
  const aiMws = mws.filter((m: any) => ['aigateway', 'semanticcache', 'piiguard', 'contentguard'].includes(m.type))

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center"><H2>AI Gateway</H2><a href="#/config"><Button size="small">⚙️ Configure</Button></a></Flex>
      <Grid columns={{ '@initial': 2, '@md': 3 }} gap={3}>
        <StatCard title="AI Middlewares" value={String(aiMws.length)} subtitle="Gateway/Cache/Guard" />
        <StatCard title="Semantic Cache" value={aiMws.some((m: any) => m.type === 'semanticcache') ? 'Active' : 'Inactive'} />
        <StatCard title="PII Guard" value={aiMws.some((m: any) => m.type === 'piiguard') ? 'Active' : 'Inactive'} />
      </Grid>
      {aiMws.length > 0 && (
        <Card css={{ p: '$4' }}><Text css={{ fontWeight: 600, mb: '$2' }}>Active AI Middlewares</Text>
          {aiMws.map((m: any) => <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}><Text>{m.name}</Text><Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.type}</Badge></Flex>)}
        </Card>
      )}
      {aiMws.length === 0 && <Card css={{ p: '$4' }}><Text css={{ color: '$textSubtle' }}>No AI middlewares active. <a href="#/config">Go to Config Manager → AI Gateway tab</a> to add LLM providers.</Text></Card>}
    </Flex>
  )
}
