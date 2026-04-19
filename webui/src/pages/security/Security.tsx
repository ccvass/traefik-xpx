import { Badge, Button, Card, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import useSWR from 'swr'

const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
  <Card css={{ p: '$4' }}><Flex direction="column" gap={1}><Text css={{ fontSize: '$3', color: '$textSubtle' }}>{title}</Text><Text css={{ fontSize: '$9', fontWeight: 700 }}>{value}</Text>{subtitle && <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{subtitle}</Text>}</Flex></Card>
)

export function Security() {
  const { data: middlewares } = useSWR('/http/middlewares')
  const mws = Array.isArray(middlewares) ? middlewares : []
  const waf = mws.filter((m: any) => m.type === 'waf')
  const apiKey = mws.filter((m: any) => m.type === 'apikey')
  const auth = mws.filter((m: any) => ['basicauth', 'digestauth', 'forwardauth', 'jwt', 'oidc', 'hmac', 'ldap'].includes(m.type))
  const opa = mws.filter((m: any) => m.type === 'opa')

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="between" align="center"><H2>Security</H2><a href="#/config"><Button size="small">⚙️ Configure</Button></a></Flex>
      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="WAF Rules" value={String(waf.length)} subtitle="Active WAF middlewares" />
        <StatCard title="API Key Auth" value={String(apiKey.length)} subtitle="API key middlewares" />
        <StatCard title="Auth Methods" value={String(auth.length)} subtitle="JWT/OIDC/LDAP/OAuth/HMAC" />
        <StatCard title="OPA Policies" value={String(opa.length)} subtitle="Policy decision points" />
      </Grid>
      {[...waf, ...apiKey, ...auth, ...opa].length > 0 && (
        <Card css={{ p: '$4' }}><Text css={{ fontWeight: 600, mb: '$2' }}>Security Middlewares</Text>
          {[...waf, ...apiKey, ...auth, ...opa].map((m: any) => (
            <Flex key={m.name} justify="between" align="center" css={{ py: '$1' }}>
              <Text>{m.name}</Text>
              <Flex gap={1}><Badge>{m.type}</Badge><Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge></Flex>
            </Flex>
          ))}
        </Card>
      )}
    </Flex>
  )
}
