import { Badge, Button, Card, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import useSWR from 'swr'

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}><Flex direction="column" gap={1}><Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text><Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>{subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}</Flex></Card>
)

export function Distributed() {
  const { data: middlewares } = useSWR('/http/middlewares')
  const mws = Array.isArray(middlewares) ? middlewares : []
  const rl = mws.filter((m: any) => m.type === 'ratelimit' || m.type === 'distributedratelimit')
  const cache = mws.filter((m: any) => m.type === 'httpcache')
  const inflight = mws.filter((m: any) => m.type === 'inflightreq' || m.type === 'distributedInflightReq')

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center"><H2>Distributed Features</H2><a href="#/config"><Button size="small">⚙️ Configure</Button></a></Flex>
      <Grid columns={{ '@initial': 2, '@md': 3 }} gap={3}>
        <StatCard title="Rate Limiters" value={String(rl.length)} subtitle="Active rate limit middlewares" />
        <StatCard title="HTTP Caches" value={String(cache.length)} subtitle="Active cache middlewares" />
        <StatCard title="In-Flight Limiters" value={String(inflight.length)} subtitle="Concurrent request limiters" />
      </Grid>
      {[...rl, ...cache, ...inflight].length > 0 && (
        <Card css={{ p: '$4' }}><Text css={{ fontWeight: 600, mb: '$2' }}>Distributed Middlewares</Text>
          {[...rl, ...cache, ...inflight].map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}>
              <Text>{m.name}</Text>
              <Flex gap={1}><Badge>{m.type}</Badge><Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge></Flex>
            </Flex>
          ))}
        </Card>
      )}
      {[...rl, ...cache, ...inflight].length === 0 && <Card css={{ p: '$4' }}><Text css={{ color: '$textSubtle' }}>No distributed middlewares active. <a href="#/config">Go to Config Manager</a> to add rate limiters, caches, or in-flight limiters.</Text></Card>}
    </Flex>
  )
}
