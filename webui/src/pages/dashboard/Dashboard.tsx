import { Badge, Box, Card, CSS, Flex, Grid, H2, H3, Text } from '@traefik-labs/faency'
import { ReactNode, useMemo } from 'react'
import useSWR from 'swr'

import ProviderIcon from 'components/icons/providers'
import FeatureCard, { FeatureCardSkeleton } from 'components/resources/FeatureCard'
import ResourceCard from 'components/resources/ResourceCard'
import TraefikResourceStatsCard, { StatsCardSkeleton } from 'components/resources/TraefikResourceStatsCard'
import PageTitle from 'layout/PageTitle'
import { capitalizeFirstLetter } from 'utils/string'

const RESOURCES = ['routers', 'services', 'middlewares']

// ─── Metric Box ─────────────────────────────────────────────────────────────

const MetricBox = ({ value, label, color }: { value: string | number; label: string; color?: string }) => (
  <Flex direction="column" align="center" css={{ px: '$3' }}>
    <Text css={{ fontSize: '$8', fontWeight: 800, color: color || '$hiContrast', lineHeight: 1 }}>{value}</Text>
    <Text css={{ fontSize: '$1', color: '$textSubtle', textTransform: 'uppercase', letterSpacing: 1, mt: '$1' }}>{label}</Text>
  </Flex>
)

// ─── Feature Panel ──────────────────────────────────────────────────────────

const FeatureStatus = ({ icon, title, href, metrics, active }: {
  icon: string; title: string; href: string; metrics: { label: string; value: string | number }[]; active: boolean
}) => (
  <a href={href} style={{ textDecoration: 'none', display: 'block' }}>
    <Card css={{
      p: '$4', cursor: 'pointer', height: '100%',
      borderLeft: active ? '3px solid $colors$green9' : '3px solid $colors$gray6',
      transition: 'transform 0.15s, box-shadow 0.15s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    }}>
      <Flex direction="column" gap={2}>
        <Flex justify="between" align="center">
          <Flex align="center" gap={2}>
            <Text css={{ fontSize: '$5' }}>{icon}</Text>
            <Text css={{ fontWeight: 700, fontSize: '$3' }}>{title}</Text>
          </Flex>
          <Box css={{
            width: 8, height: 8, borderRadius: '50%',
            background: active ? '$green9' : '$gray7',
          }} />
        </Flex>
        {metrics.map((m, i) => (
          <Flex key={i} justify="between" align="center" css={{ py: '$1', borderTop: i === 0 ? '1px solid $colors$gray4' : 'none' }}>
            <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{m.label}</Text>
            <Text css={{ fontSize: '$2', fontWeight: 600 }}>{m.value}</Text>
          </Flex>
        ))}
        <Text css={{ fontSize: '$1', color: '$blue9', fontWeight: 500, mt: '$1' }}>
          {active ? 'View details →' : 'Configure →'}
        </Text>
      </Flex>
    </Card>
  </a>
)

// ─── System Health Bar ──────────────────────────────────────────────────────

const HealthBar = () => {
  const { data: version } = useSWR('/version')
  const { data: overview } = useSWR('/overview')
  const { data: entrypoints } = useSWR('/entrypoints')

  const totalRouters = (overview?.http?.routers?.total || 0) + (overview?.tcp?.routers?.total || 0) + (overview?.udp?.routers?.total || 0)
  const totalServices = (overview?.http?.services?.total || 0) + (overview?.tcp?.services?.total || 0) + (overview?.udp?.services?.total || 0)
  const totalMw = overview?.http?.middlewares?.total || 0
  const totalEp = Array.isArray(entrypoints) ? entrypoints.length : 0
  const errors = (overview?.http?.routers?.errors || 0) + (overview?.http?.services?.errors || 0)

  return (
    <Card css={{ p: '$4', background: '$gray2', borderRadius: '$2' }}>
      <Flex justify="between" align="center" wrap="wrap" gap={3}>
        <Flex align="center" gap={3}>
          <Box css={{ width: 12, height: 12, borderRadius: '50%', background: errors > 0 ? '$red9' : '$green9' }} />
          <Flex direction="column">
            <Text css={{ fontWeight: 700, fontSize: '$4' }}>traefik-api-srv</Text>
            <Text css={{ fontSize: '$2', color: '$textSubtle' }}>
              {version?.Version || 'dev'} • {totalEp} entrypoints • {errors > 0 ? `${errors} errors` : 'All systems healthy'}
            </Text>
          </Flex>
        </Flex>
        <Flex gap={4}>
          <MetricBox value={totalRouters} label="Routes" />
          <MetricBox value={totalServices} label="Services" />
          <MetricBox value={totalMw} label="Middlewares" />
          <MetricBox value={totalEp} label="Endpoints" />
        </Flex>
      </Flex>
    </Card>
  )
}

// ─── Feature Grid ───────────────────────────────────────────────────────────

const FeatureGrid = () => {
  const { data: middlewares } = useSWR('/http/middlewares')
  const { data: routers } = useSWR('/http/routers')
  const { data: services } = useSWR('/http/services')
  const { data: overview } = useSWR('/overview')

  const mws = Array.isArray(middlewares) ? middlewares : []
  const waf = mws.filter((m: any) => m.type === 'waf').length
  const auth = mws.filter((m: any) => ['apikey', 'jwt', 'oidc', 'hmac', 'ldap', 'basicauth'].includes(m.type)).length
  const rl = mws.filter((m: any) => m.type === 'ratelimit').length
  const cache = mws.filter((m: any) => m.type === 'httpcache').length
  const inflight = mws.filter((m: any) => m.type === 'inflightreq').length
  const fileApis = Array.isArray(routers) ? routers.filter((r: any) => r.provider === 'file').length : 0

  return (
    <Grid gap={3} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      <FeatureStatus icon="🤖" title="AI Gateway" href="#/ai" active={false} metrics={[
        { label: 'Semantic Cache', value: mws.some((m: any) => m.type === 'semanticcache') ? 'Active' : 'Off' },
        { label: 'PII Guard', value: mws.some((m: any) => m.type === 'piiguard') ? 'Active' : 'Off' },
      ]} />
      <FeatureStatus icon="🔧" title="MCP Gateway" href="#/mcp" active={false} metrics={[
        { label: 'TBAC Engine', value: mws.some((m: any) => m.type === 'tbac') ? 'Active' : 'Off' },
        { label: 'Audit Logger', value: mws.some((m: any) => m.type === 'mcpaudit') ? 'Active' : 'Off' },
      ]} />
      <FeatureStatus icon="🛡️" title="Security" href="#/security" active={waf + auth > 0} metrics={[
        { label: 'WAF Rules', value: waf },
        { label: 'Auth Middlewares', value: auth },
      ]} />
      <FeatureStatus icon="⚡" title="Distributed" href="#/distributed" active={rl + cache + inflight > 0} metrics={[
        { label: 'Rate Limiters', value: rl },
        { label: 'HTTP Caches', value: cache },
      ]} />
      <FeatureStatus icon="📦" title="API Management" href="#/api-management" active={fileApis > 0} metrics={[
        { label: 'Managed APIs', value: fileApis },
        { label: 'Total Middlewares', value: mws.length },
      ]} />
      <FeatureStatus icon="📊" title="Observability" href="#/grafana" active={true} metrics={[
        { label: 'Grafana Dashboards', value: 5 },
        { label: 'Metrics', value: overview?.features?.metrics ? 'On' : 'Off' },
      ]} />
    </Grid>
  )
}

// ─── Quick Actions ──────────────────────────────────────────────────────────

const QuickActions = () => (
  <Flex gap={2} wrap="wrap">
    {[
      { label: '⚙️ Config Manager', href: '#/config' },
      { label: '🌐 Multi-Cluster', href: '#/clusters' },
      { label: '📥 Backup', href: '#/config' },
    ].map(a => (
      <a key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
        <Card css={{ px: '$3', py: '$2', cursor: 'pointer', '&:hover': { borderColor: '$blue7' } }}>
          <Text css={{ fontSize: '$2', fontWeight: 500 }}>{a.label}</Text>
        </Card>
      </a>
    ))}
  </Flex>
)

// ─── Proxy Section ──────────────────────────────────────────────────────────

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

// ─── Main Dashboard ─────────────────────────────────────────────────────────

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

  if (!entrypoints || !overview) {
    return <DashboardSkeleton />
  }

  return (
    <Flex direction="column" gap={5}>
      <PageTitle title="Dashboard" />

      {/* System Health */}
      <HealthBar />

      {/* Feature Status Grid */}
      <Flex direction="column" gap={2}>
        <Flex justify="between" align="center">
          <H3 css={{ fontSize: '$5', color: '$textSubtle' }}>Platform Features</H3>
          <QuickActions />
        </Flex>
        <FeatureGrid />
      </Flex>

      {/* Proxy Overview */}
      <SectionContainer title="Entrypoints" css={{ mt: '$2' }}>
        {entrypoints?.map((i, idx) => (
          <ResourceCard
            key={`entrypoint-${i.name}-${idx}`}
            css={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '125px',
            }}
          >
            <Flex direction="column" gap={2} css={{ p: '$4' }}>
              <Text css={{ fontWeight: '$bold', textTransform: 'uppercase' }}>{i.name}</Text>
              <Text css={{ color: '$textSubtle' }}>{i.address}</Text>
            </Flex>
          </ResourceCard>
        ))}
      </SectionContainer>

      {hasResources.http && (
        <SectionContainer title="HTTP">
          {RESOURCES.map((i) => (
            <TraefikResourceStatsCard
              key={`http-${i}`}
              title={capitalizeFirstLetter(i)}
              data={overview?.http?.[i]}
              to={`/http/${i}`}
            />
          ))}
        </SectionContainer>
      )}

      {hasResources.tcp && (
        <SectionContainer title="TCP">
          {RESOURCES.map((i) => (
            <TraefikResourceStatsCard
              key={`tcp-${i}`}
              title={capitalizeFirstLetter(i)}
              data={overview?.tcp?.[i]}
              to={`/tcp/${i}`}
            />
          ))}
        </SectionContainer>
      )}

      {hasResources.udp && (
        <SectionContainer title="UDP">
          {['routers', 'services'].map((i) => (
            <TraefikResourceStatsCard
              key={`udp-${i}`}
              title={capitalizeFirstLetter(i)}
              data={overview?.udp?.[i]}
              to={`/udp/${i}`}
            />
          ))}
        </SectionContainer>
      )}

      {features.length > 0 && (
        <SectionContainer title="Features" childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
          {features.map((i, idx) => (
            <FeatureCard key={`feature-${i.name}-${idx}`} name={i.name} value={i.value} />
          ))}
        </SectionContainer>
      )}

      {overview?.providers &&
        Object.keys(overview.providers).filter((key) => overview.providers[key]).length > 0 && (
          <SectionContainer title="Providers" childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            {Object.keys(overview.providers)
              .filter((key) => overview.providers[key])
              .map((key, idx) => (
                <ResourceCard key={`provider-${key}-${idx}`} css={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px' }}>
                  <ProviderIcon name={key} width={80} />
                </ResourceCard>
              ))}
          </SectionContainer>
        )}
    </Flex>
  )
}

export const DashboardSkeleton = () => {
  return (
    <Flex direction="column" gap={6}>
      <SectionContainer title="Entrypoints" css={{ mt: 0 }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <ResourceCard key={`skeleton-ep-${idx}`} css={{ minHeight: '125px' }} />
        ))}
      </SectionContainer>
      {['HTTP', 'TCP', 'UDP'].map((protocol) => (
        <SectionContainer key={protocol} title={protocol}>
          {RESOURCES.map((i) => (
            <StatsCardSkeleton key={`${protocol}-${i}`} />
          ))}
        </SectionContainer>
      ))}
      <SectionContainer title="Features" childrenContainerCss={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <FeatureCardSkeleton key={`skeleton-feature-${idx}`} />
        ))}
      </SectionContainer>
    </Flex>
  )
}
