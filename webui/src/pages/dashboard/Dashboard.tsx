import { Card, CSS, Flex, Grid, H2, Text } from '@traefik-labs/faency'
import { ReactNode, useMemo } from 'react'
import useSWR from 'swr'

import ProviderIcon from 'components/icons/providers'
import FeatureCard, { FeatureCardSkeleton } from 'components/resources/FeatureCard'
import ResourceCard from 'components/resources/ResourceCard'
import TraefikResourceStatsCard, { StatsCardSkeleton } from 'components/resources/TraefikResourceStatsCard'
import PageTitle from 'layout/PageTitle'
import { capitalizeFirstLetter } from 'utils/string'


const PlatformOverview = () => {
  const { data: middlewares } = useSWR('/http/middlewares')
  const { data: routers } = useSWR('/http/routers')
  const { data: services } = useSWR('/http/services')

  const mws = Array.isArray(middlewares) ? middlewares : []
  const totalRouters = Array.isArray(routers) ? routers.length : 0
  const totalServices = Array.isArray(services) ? services.length : 0
  const wafCount = mws.filter((m: any) => m.type === 'waf').length
  const authCount = mws.filter((m: any) => ['apikey', 'jwt', 'oidc', 'hmac', 'ldap', 'basicauth'].includes(m.type)).length
  const rateLimitCount = mws.filter((m: any) => m.type === 'ratelimit').length
  const cacheCount = mws.filter((m: any) => m.type === 'httpcache').length

  const panels = [
    { icon: '🤖', title: 'AI Gateway', href: '#/ai', active: false, lines: ['Click to configure'] },
    { icon: '🔧', title: 'MCP Gateway', href: '#/mcp', active: false, lines: ['Click to configure'] },
    { icon: '🛡️', title: 'Security', href: '#/security', active: wafCount + authCount > 0, lines: [`${wafCount} WAF, ${authCount} Auth`] },
    { icon: '⚡', title: 'Distributed', href: '#/distributed', active: rateLimitCount + cacheCount > 0, lines: [`${rateLimitCount} rate limits, ${cacheCount} caches`] },
    { icon: '📦', title: 'API Mgmt', href: '#/api-management', active: totalRouters > 0, lines: [`${totalRouters} routers, ${totalServices} services`] },
    { icon: '📊', title: 'Observability', href: '#/grafana', active: true, lines: ['5 Grafana dashboards'] },
  ]

  return (
    <Flex direction="column" gap={4}>
      <Flex gap={3} css={{ p: '$3', background: '$gray2', borderRadius: '$2' }} justify="between" align="center">
        <Flex gap={4}>
          <Flex direction="column" align="center"><Text css={{ fontSize: '$7', fontWeight: 700 }}>{totalRouters}</Text><Text css={{ fontSize: '$1', color: '$textSubtle' }}>Routers</Text></Flex>
          <Flex direction="column" align="center"><Text css={{ fontSize: '$7', fontWeight: 700 }}>{totalServices}</Text><Text css={{ fontSize: '$1', color: '$textSubtle' }}>Services</Text></Flex>
          <Flex direction="column" align="center"><Text css={{ fontSize: '$7', fontWeight: 700 }}>{mws.length}</Text><Text css={{ fontSize: '$1', color: '$textSubtle' }}>Middlewares</Text></Flex>
        </Flex>
        <a href="#/config" style={{ textDecoration: 'none' }}><Card css={{ p: '$2 $3', cursor: 'pointer', fontWeight: 600 }}>⚙️ Config Manager</Card></a>
      </Flex>
      <Grid gap={3} css={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {panels.map(p => (
          <a key={p.title} href={p.href} style={{ textDecoration: 'none' }}>
            <Card css={{ p: '$3', cursor: 'pointer', '&:hover': { borderColor: '$blue7' }, height: '100%' }}>
              <Flex direction="column" gap={1}>
                <Flex justify="between" align="center">
                  <Text css={{ fontSize: '$4' }}>{p.icon}</Text>
                  <Text css={{ fontSize: '$1', color: p.active ? '$green9' : '$blue9' }}>{p.active ? '● Active' : '○ Available'}</Text>
                </Flex>
                <Text css={{ fontWeight: 600, fontSize: '$3' }}>{p.title}</Text>
                {p.lines.map((l, i) => <Text key={i} css={{ fontSize: '$1', color: '$textSubtle' }}>{l}</Text>)}
                <Text css={{ fontSize: '$1', color: '$blue9', mt: '$1' }}>Configure →</Text>
              </Flex>
            </Card>
          </a>
        ))}
      </Grid>
    </Flex>
  )
}


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
