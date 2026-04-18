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

export const Security = () => {
  return (
    <Flex direction="column" gap={6}>
      <PageTitle title="Security" />

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>WAF (Coraza)</H2>
        <Grid gap={4} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <StatCard title="Requests Inspected" value="0" subtitle="Last 24h" />
          <StatCard title="Blocked" value="0" subtitle="403 responses" />
          <StatCard title="SQL Injection" value="0" subtitle="Detected" />
          <StatCard title="XSS" value="0" subtitle="Detected" />
        </Grid>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>OPA Authorization</H2>
        <Grid gap={4} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <StatCard title="Evaluations" value="0" />
          <StatCard title="Allowed" value="0" />
          <StatCard title="Denied" value="0" />
        </Grid>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Authentication</H2>
        <Grid gap={4} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {['JWT', 'OIDC', 'API Key', 'HMAC', 'LDAP', 'OAuth'].map((method) => (
            <Card key={method} css={{ p: '$4' }}>
              <Flex justify="between" align="center">
                <Text css={{ fontWeight: 600 }}>{method}</Text>
                <Badge variant="gray">No data</Badge>
              </Flex>
            </Card>
          ))}
        </Grid>
      </Flex>

      <Flex direction="column" gap={4}>
        <H2 css={{ fontSize: '$8' }}>Vault</H2>
        <Card css={{ p: '$4' }}>
          <Flex justify="between" align="center">
            <Text>HashiCorp Vault</Text>
            <Badge variant="gray">Not configured</Badge>
          </Flex>
        </Card>
      </Flex>
    </Flex>
  )
}

export default Security
