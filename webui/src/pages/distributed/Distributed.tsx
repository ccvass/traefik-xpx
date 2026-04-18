import { Card, Flex, Grid, H2, Text, Badge } from '@traefik-labs/faency'
import useSWR from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

async function fetchSection(section: string) {
  const res = await fetch(`${API_BASE}/config/static?section=${section}`)
  if (!res.ok) return null
  return res.json()
}

const StatCard = ({ title, value, subtitle, variant }: { title: string; value: string; subtitle?: string; variant?: string }) => (
  <Card css={{ p: '$4' }}>
    <Flex direction="column" gap={1}>
      <Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text>
      <Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>
      {subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}
    </Flex>
  </Card>
)

export function Distributed() {
  const { data: middlewares } = useSWR('/http/middlewares')
  const { data: overview } = useSWR('/overview')

  const rateLimitMw = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'ratelimit' || m.type === 'distributedratelimit') : []
  const cacheMw = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'httpcache') : []
  const inflightMw = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'inflightreq' || m.type === 'distributedInflightReq') : []

  return (
    <Flex direction="column" gap={4}>
      <H2>Distributed Features</H2>

      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="Rate Limiters" value={String(rateLimitMw.length)} subtitle="Active rate limit middlewares" />
        <StatCard title="HTTP Caches" value={String(cacheMw.length)} subtitle="Active cache middlewares" />
        <StatCard title="In-Flight Limiters" value={String(inflightMw.length)} subtitle="Concurrent request limiters" />
        <StatCard title="ACME Certs" value={overview?.features?.acme ? 'Active' : 'Inactive'} subtitle="Let's Encrypt" />
      </Grid>

      {rateLimitMw.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>Rate Limit Middlewares</Text>
          {rateLimitMw.map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}>
              <Flex direction="column">
                <Text>{m.name}</Text>
                <Text css={{ fontSize: '$2', color: '$textSubtle' }}>
                  {m.rateLimit?.average && `${m.rateLimit.average} req/s`}
                  {m.rateLimit?.burst && ` (burst: ${m.rateLimit.burst})`}
                  {m.rateLimit?.redis && ' [Redis]'}
                </Text>
              </Flex>
              <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
            </Flex>
          ))}
        </Card>
      )}

      {cacheMw.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ fontWeight: 600, mb: '$2' }}>HTTP Cache Middlewares</Text>
          {cacheMw.map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}>
              <Text>{m.name}</Text>
              <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
            </Flex>
          ))}
        </Card>
      )}

      {rateLimitMw.length === 0 && cacheMw.length === 0 && inflightMw.length === 0 && (
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No distributed middlewares configured. Add rateLimit, httpCache, or distributedInFlightReq middlewares to your dynamic configuration.</Text>
        </Card>
      )}
    </Flex>
  )
}
