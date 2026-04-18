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

export function Security() {
  const { data: middlewares } = useSWR('/http/middlewares')

  const wafMiddlewares = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'waf') : []
  const apiKeyMiddlewares = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'apikey') : []
  const authMiddlewares = Array.isArray(middlewares)
    ? middlewares.filter((m: any) => ['basicauth', 'digestauth', 'forwardauth', 'jwt', 'oidc', 'oauth2introspection', 'hmac', 'ldap'].includes(m.type))
    : []
  const opaMiddlewares = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'opa') : []

  return (
    <Flex direction="column" gap={4}>
      <H2>Security</H2>

      <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
        <StatCard title="WAF Rules" value={String(wafMiddlewares.length)} subtitle="Active WAF middlewares" />
        <StatCard title="API Key Auth" value={String(apiKeyMiddlewares.length)} subtitle="API key middlewares" />
        <StatCard title="Auth Methods" value={String(authMiddlewares.length)} subtitle="JWT/OIDC/LDAP/OAuth/HMAC" />
        <StatCard title="OPA Policies" value={String(opaMiddlewares.length)} subtitle="Policy decision points" />
      </Grid>

      {wafMiddlewares.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Flex direction="column" gap={2}>
            <Text css={{ fontWeight: 600 }}>WAF Middlewares</Text>
            {wafMiddlewares.map((m: any) => (
              <Flex key={m.name} justify="between" align="center">
                <Text>{m.name}</Text>
                <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
              </Flex>
            ))}
          </Flex>
        </Card>
      )}

      {apiKeyMiddlewares.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Flex direction="column" gap={2}>
            <Text css={{ fontWeight: 600 }}>API Key Middlewares</Text>
            {apiKeyMiddlewares.map((m: any) => (
              <Flex key={m.name} justify="between" align="center">
                <Text>{m.name}</Text>
                <Badge variant={m.status === 'enabled' ? 'green' : 'red'}>{m.status}</Badge>
              </Flex>
            ))}
          </Flex>
        </Card>
      )}

      {authMiddlewares.length > 0 && (
        <Card css={{ p: '$4' }}>
          <Flex direction="column" gap={2}>
            <Text css={{ fontWeight: 600 }}>Authentication Middlewares</Text>
            {authMiddlewares.map((m: any) => (
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
    </Flex>
  )
}
