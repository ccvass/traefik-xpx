import { Badge, Button, Card, CSS, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import { ReactNode, useMemo } from 'react'
import useSWR from 'swr'

import ProviderIcon from 'components/icons/providers'
import FeatureCard, { FeatureCardSkeleton } from 'components/resources/FeatureCard'
import ResourceCard from 'components/resources/ResourceCard'
import TraefikResourceStatsCard, { StatsCardSkeleton } from 'components/resources/TraefikResourceStatsCard'
import PageTitle from 'layout/PageTitle'
import { capitalizeFirstLetter } from 'utils/string'


const API_BASE = (window as any).APIUrl || '/api'

const FeaturePanel = ({ title, icon, href, status, children }: { title: string; icon: string; href: string; status: 'active' | 'available' | 'off'; children: React.ReactNode }) => (
  <a href={`#${href}`} style={{ textDecoration: 'none' }}>
    <Card css={{ p: '$4', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '$3' }, height: '100%' }}>
      <Flex direction="column" gap={2} css={{ height: '100%' }}>
        <Flex justify="between" align="center">
          <Text css={{ fontSize: '$5' }}>{icon}</Text>
          <Badge variant={status === 'active' ? 'green' : status === 'available' ? 'blue' : 'gray'} css={{ fontSize: '$1' }}>
            {status === 'active' ? '● Active' : status === 'available' ? '○ Available' : '○ Off'}
          </Badge>
        </Flex>
        <Text css={{ fontWeight: 700, fontSize: '$4' }}>{title}</Text>
        <Flex direction="column" gap={1} css={{ flex: 1 }}>
          {children}
        </Flex>
        <Text css={{ fontSize: '$1', color: '$blue9', fontWeight: 500 }}>Configure →</Text>
      </Flex>
    </Card>
  </a>
)

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <Flex justify="between" align="center">
    <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{label}</Text>
    <Text css={{ fontSize: '$2', fontWeight: 600 }}>{value}</Text>
  </Flex>
)

const PlatformOverview = () => {
  const { data: aiStatus } = useSWR('ai-status', () => fetch(`${API_BASE}/ai/status`).then(r => r.json()).catch(() => null))
  const { data: mcpStatus } = useSWR('mcp-status', () => fetch(`${API_BASE}/mcp/status`).then(r => r.json()).catch(() => null))
  const { data: middlewares } = useSWR('/http/middlewares')
  const { data: overview } = useSWR('/overview')
  const { data: routers } = useSWR('/http/routers')
  const { data: services } = useSWR('/http/services')

  const mws = Array.isArray(middlewares) ? middlewares : []
  const wafCount = mws.filter((m: any) => m.type === 'waf').length
  const authCount = mws.filter((m: any) => ['apikey', 'jwt', 'oidc', 'hmac', 'ldap', 'basicauth', 'forwardauth'].includes(m.type)).length
  const opaCount = mws.filter((m: any) => m.type === 'opa').length
  const cacheCount = mws.filter((m: any) => m.type === 'httpcache').length
  const rateLimitCount = mws.filter((m: any) => ['ratelimit', 'distributedratelimit'].includes(m.type)).length
  const inflightCount = mws.filter((m: any) => ['inflightreq', 'distributedInflightReq'].includes(m.type)).length
  const totalRouters = Array.isArray(routers) ? routers.length : 0
  const totalServices = Array.isArray(services) ? services.length : 0
  const fileRouters = Array.isArray(routers) ? routers.filter((r: any) => r.provider === 'file').length : 0

  return (
    <Flex direction="column" gap={4}>
      {/* Summary Bar */}
      <Card css={{ p: '$3', background: '$gray2' }}>
        <Flex justify="between" align="center" wrap="wrap" gap={3}>
          <Flex gap={4}>
            <Flex direction="column" align="center">
              <Text css={{ fontSize: '$7', fontWeight: 700 }}>{totalRouters}</Text>
              <Text css={{ fontSize: '$1', color: '$textSubtle' }}>Routers</Text>
            </Flex>
            <Flex direction="column" align="center">
              <Text css={{ fontSize: '$7', fontWeight: 700 }}>{totalServices}</Text>
              <Text css={{ fontSize: '$1', color: '$textSubtle' }}>Services</Text>
            </Flex>
            <Flex direction="column" align="center">
              <Text css={{ fontSize: '$7', fontWeight: 700 }}>{mws.length}</Text>
              <Text css={{ fontSize: '$1', color: '$textSubtle' }}>Middlewares</Text>
            </Flex>
            <Flex direction="column" align="center">
              <Text css={{ fontSize: '$7', fontWeight: 700 }}>{fileRouters}</Text>
              <Text css={{ fontSize: '$1', color: '$textSubtle' }}>Managed APIs</Text>
            </Flex>
          </Flex>
          <a href="#/config"><Button>⚙️ Config Manager</Button></a>
        </Flex>
      </Card>

      {/* Feature Panels */}
      <Grid columns={{ '@initial': 1, '@sm': 2, '@lg': 3 }} gap={3}>
        <FeaturePanel title="AI Gateway" icon="🤖" href="/ai" status={aiStatus?.enabled ? 'active' : 'available'}>
          <Metric label="Providers" value={aiStatus?.components || 0} />
          <Metric label="Semantic Cache" value={mws.some((m: any) => m.type === 'semanticcache') ? 'On' : 'Off'} />
          <Metric label="PII Guard" value={mws.some((m: any) => m.type === 'piiguard') ? 'On' : 'Off'} />
        </FeaturePanel>

        <FeaturePanel title="MCP Gateway" icon="🔧" href="/mcp" status={mcpStatus?.enabled ? 'active' : 'available'}>
          <Metric label="Servers" value={mcpStatus?.components || 0} />
          <Metric label="TBAC Rules" value={mws.filter((m: any) => m.type === 'tbac').length} />
          <Metric label="Audit Logger" value={mws.some((m: any) => m.type === 'mcpaudit') ? 'On' : 'Off'} />
        </FeaturePanel>

        <FeaturePanel title="Security" icon="🛡️" href="/security" status={wafCount + authCount + opaCount > 0 ? 'active' : 'available'}>
          <Metric label="WAF Rules" value={wafCount} />
          <Metric label="Auth Middlewares" value={authCount} />
          <Metric label="OPA Policies" value={opaCount} />
        </FeaturePanel>

        <FeaturePanel title="Distributed" icon="⚡" href="/distributed" status={rateLimitCount + cacheCount + inflightCount > 0 ? 'active' : 'available'}>
          <Metric label="Rate Limiters" value={rateLimitCount} />
          <Metric label="HTTP Caches" value={cacheCount} />
          <Metric label="In-Flight Limiters" value={inflightCount} />
        </FeaturePanel>

        <FeaturePanel title="API Management" icon="📦" href="/api-management" status={fileRouters > 0 ? 'active' : 'available'}>
          <Metric label="Managed APIs" value={fileRouters} />
          <Metric label="Total Middlewares" value={mws.length} />
          <Metric label="Mock Endpoints" value={mws.filter((m: any) => m.type === 'apimock').length} />
        </FeaturePanel>

        <FeaturePanel title="Observability" icon="📊" href="/grafana" status="active">
          <Metric label="Grafana Dashboards" value="5" />
          <Metric label="Metrics" value={overview?.features?.metrics ? 'On' : 'Off'} />
          <Metric label="Tracing" value={overview?.features?.tracing ? 'On' : 'Off'} />
        </FeaturePanel>
      </Grid>
    </Flex>
  )
}

const RESOURCES = ['routers', 'services', 'middlewares']

const SectionContainer = ({
  title,
  children,
  childrenContainerCss,
  css,
}: {
  title: string
  children: ReactNode
  childrenContainerCss?: CSS
  css?: CSS
}) => {
  return (
    <Flex direction="column" gap={4} css={{ mt: '$4', ...css }}>
      <Flex align="center" gap={2} css={{ color: '$headingDefault', mb: '$4' }}>
        <H2 css={{ fontSize: '$8' }}>{title}</H2>
      </Flex>
      <Grid
        gap={6}
        css={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
          alignItems: 'stretch',
          ...childrenContainerCss,
        }}
      >
        {children}
      </Grid>
    </Flex>
  )
}

type ResourceData = {
  errors: number
  warnings: number
  total: number
}

export const Dashboard = () => {
  const { data: entrypoints } = useSWR('/entrypoints')
  const { data: overview } = useSWR('/overview')

  const features = useMemo(
    () =>
      overview?.features
        ? Object.keys(overview?.features).map((key: string) => {
            return { name: key, value: overview.features[key] }
          })
        : [],
    [overview?.features],
  )

  const hasResources = useMemo(() => {
    const filterFn = (x: ResourceData) => !x.errors && !x.total && !x.warnings
    return {
      http: Object.values<ResourceData>(overview?.http || {}).filter(filterFn).length !== 3,
      tcp: Object.values<ResourceData>(overview?.tcp || {}).filter(filterFn).length !== 3,
      udp: Object.values<ResourceData>(overview?.udp || {}).filter(filterFn).length !== 2,
    }
  }, [overview])

  // @FIXME skeleton not correctly displayed if only using suspense
  if (!entrypoints || !overview) {
    return <DashboardSkeleton />
  }

  return (
    <Flex direction="column" gap={6}>
      <PageTitle title="Dashboard" />

      {/* Platform Overview */}
      <PlatformOverview />

      <SectionContainer title="Entrypoints" css={{ mt: 0 }}>
        {entrypoints?.map((i, idx) => (
          <ResourceCard
            key={`entrypoint-${i.name}-${idx}`}
            css={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '125px',
            }}
            title={i.name}
            titleCSS={{ textAlign: 'center' }}
          >
            <Text css={{ fontSize: '$11', fontWeight: 500, wordBreak: 'break-word' }}>{i.address}</Text>
          </ResourceCard>
        ))}
      </SectionContainer>

      <SectionContainer
        title="HTTP"
        childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}
      >
        {overview?.http && hasResources.http ? (
          RESOURCES.map((i) => (
            <TraefikResourceStatsCard
              key={`http-${i}`}
              title={capitalizeFirstLetter(i)}
              data-testid={`section-http-${i}`}
              linkTo={`/http/${i}`}
              {...overview.http[i]}
            />
          ))
        ) : (
          <Text size={4}>No related objects to show.</Text>
        )}
      </SectionContainer>

      <SectionContainer
        title="TCP"
        childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}
      >
        {overview?.tcp && hasResources.tcp ? (
          RESOURCES.map((i) => (
            <TraefikResourceStatsCard
              key={`tcp-${i}`}
              title={capitalizeFirstLetter(i)}
              data-testid={`section-tcp-${i}`}
              linkTo={`/tcp/${i}`}
              {...overview.tcp[i]}
            />
          ))
        ) : (
          <Text size={4}>No related objects to show.</Text>
        )}
      </SectionContainer>

      <SectionContainer
        title="UDP"
        childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}
      >
        {overview?.udp && hasResources.udp ? (
          RESOURCES.map((i) => (
            <TraefikResourceStatsCard
              key={`udp-${i}`}
              title={capitalizeFirstLetter(i)}
              data-testid={`section-udp-${i}`}
              linkTo={`/udp/${i}`}
              {...overview.udp[i]}
            />
          ))
        ) : (
          <Text size={4}>No related objects to show.</Text>
        )}
      </SectionContainer>

      <SectionContainer title="Features">
        {features.length
          ? features.map((i, idx) => {
              return <FeatureCard key={`feature-${idx}`} feature={i} />
            })
          : null}
      </SectionContainer>

      <SectionContainer title="Providers">
        {overview?.providers?.length ? (
          overview.providers.map((p, idx) => (
            <Card key={`provider-${idx}`} css={{ height: 125 }}>
              <Flex direction="column" align="center" gap={3} justify="center" css={{ height: '100%' }}>
                <ProviderIcon name={p} size={52} />
                <Text css={{ fontSize: '$4', fontWeight: 500, textAlign: 'center' }}>{p}</Text>
              </Flex>
            </Card>
          ))
        ) : (
          <Text size={4}>No related objects to show.</Text>
        )}
      </SectionContainer>
    </Flex>
  )
}

export const DashboardSkeleton = () => {
  return (
    <Flex direction="column" gap={6}>
      <SectionContainer title="Entrypoints" css={{ mt: 0 }}>
        {[...Array(5)].map((_, i) => (
          <FeatureCardSkeleton key={`entry-skeleton-${i}`} />
        ))}
      </SectionContainer>

      <SectionContainer
        title="HTTP"
        childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}
      >
        {[...Array(3)].map((_, i) => (
          <StatsCardSkeleton key={`http-skeleton-${i}`} />
        ))}
      </SectionContainer>

      <SectionContainer
        title="TCP"
        childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}
      >
        {[...Array(3)].map((_, i) => (
          <StatsCardSkeleton key={`tcp-skeleton-${i}`} />
        ))}
      </SectionContainer>

      <SectionContainer
        title="UDP"
        childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}
      >
        {[...Array(3)].map((_, i) => (
          <StatsCardSkeleton key={`udp-skeleton-${i}`} />
        ))}
      </SectionContainer>

      <SectionContainer title="Features">
        {[...Array(3)].map((_, i) => (
          <FeatureCardSkeleton key={`feature-skeleton-${i}`} />
        ))}
      </SectionContainer>

      <SectionContainer title="Providers">
        {[...Array(3)].map((_, i) => (
          <FeatureCardSkeleton key={`provider-skeleton-${i}`} />
        ))}
      </SectionContainer>
    </Flex>
  )
}
