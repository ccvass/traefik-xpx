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

const PlatformStatusCard = ({ title, status, detail, href }: { title: string; status: string; detail: string; href: string }) => (
  <a href={`#${href}`} style={{ textDecoration: 'none' }}>
    <Card css={{ p: '$3', cursor: 'pointer', '&:hover': { borderColor: '$blue7' } }}>
      <Flex direction="column" gap={1}>
        <Flex justify="between" align="center">
          <Text css={{ fontWeight: 600, fontSize: '$3' }}>{title}</Text>
          <Badge variant={status === 'active' ? 'green' : status === 'available' ? 'blue' : 'gray'} css={{ fontSize: '$1' }}>
            {status}
          </Badge>
        </Flex>
        <Text css={{ fontSize: '$2', color: '$textSubtle' }}>{detail}</Text>
      </Flex>
    </Card>
  </a>
)

const PlatformStatus = () => {
  const { data: aiStatus } = useSWR('ai-status', () => fetch(`${API_BASE}/ai/status`).then(r => r.json()).catch(() => null))
  const { data: mcpStatus } = useSWR('mcp-status', () => fetch(`${API_BASE}/mcp/status`).then(r => r.json()).catch(() => null))
  const { data: middlewares } = useSWR('/http/middlewares')

  const securityCount = Array.isArray(middlewares)
    ? middlewares.filter((m: any) => ['waf', 'apikey', 'jwt', 'oidc', 'hmac', 'ldap', 'opa'].includes(m.type)).length
    : 0
  const cacheCount = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'httpcache').length : 0
  const rateLimitCount = Array.isArray(middlewares) ? middlewares.filter((m: any) => m.type === 'ratelimit').length : 0

  return (
    <Grid columns={{ '@initial': 2, '@md': 4 }} gap={3}>
      <PlatformStatusCard
        title="🤖 AI Gateway"
        status={aiStatus?.enabled ? 'active' : 'available'}
        detail={aiStatus?.enabled ? `${aiStatus.components} providers` : 'Not configured'}
        href="/ai"
      />
      <PlatformStatusCard
        title="🔧 MCP Gateway"
        status={mcpStatus?.enabled ? 'active' : 'available'}
        detail={mcpStatus?.enabled ? `${mcpStatus.components} servers` : 'Not configured'}
        href="/mcp"
      />
      <PlatformStatusCard
        title="🛡️ Security"
        status={securityCount > 0 ? 'active' : 'available'}
        detail={securityCount > 0 ? `${securityCount} active middlewares` : 'No security middlewares'}
        href="/security"
      />
      <PlatformStatusCard
        title="⚡ Distributed"
        status={rateLimitCount + cacheCount > 0 ? 'active' : 'available'}
        detail={`${rateLimitCount} rate limits, ${cacheCount} caches`}
        href="/distributed"
      />
    </Grid>
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

      {/* Platform Status */}
      <PlatformStatus />

      {/* Quick Actions */}
      <Card css={{ p: '$4', background: '$blue2' }}>
        <Flex justify="between" align="center" wrap="wrap" gap={2}>
          <Text css={{ fontWeight: 600 }}>⚙️ Quick Actions</Text>
          <Flex gap={2} wrap="wrap">
            <a href="#/config"><Button size="small">🔧 Config Manager</Button></a>
            <a href="#/ai"><Button size="small" variant="secondary">🤖 AI Gateway</Button></a>
            <a href="#/mcp"><Button size="small" variant="secondary">🔧 MCP Gateway</Button></a>
            <a href="#/security"><Button size="small" variant="secondary">🛡️ Security</Button></a>
            <a href="#/distributed"><Button size="small" variant="secondary">⚡ Distributed</Button></a>
            <a href="#/grafana"><Button size="small" variant="secondary">📊 Grafana</Button></a>
          </Flex>
        </Flex>
      </Card>

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
