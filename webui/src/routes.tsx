import { ReactNode } from 'react'
import {
  LiaProjectDiagramSolid,
  LiaServerSolid,
  LiaCogsSolid,
  LiaHomeSolid,
  LiaCertificateSolid,
} from 'react-icons/lia'
import { MdOutlineSecurity, MdOutlineSmartToy, MdOutlineHub, MdOutlineApi, MdOutlineSettings } from 'react-icons/md'

export type Route = {
  path: string
  label: string
  icon?: string | ReactNode
  activeMatches?: string[]
}

type RouteSections = {
  section: string
  items: Route[]
  sectionLabel?: string
}

export const ROUTES: RouteSections[] = [
  {
    section: 'dashboard',
    items: [
      {
        path: '/',
        label: 'Dashboard',
        icon: <LiaHomeSolid color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'http',
    sectionLabel: 'HTTP',
    items: [
      {
        path: '/http/routers',
        activeMatches: ['/http/routers/:name'],
        label: 'HTTP Routers',
        icon: <LiaProjectDiagramSolid color="currentColor" size={20} />,
      },
      {
        path: '/http/services',
        activeMatches: ['/http/services/:name'],
        label: 'HTTP Services',
        icon: <LiaServerSolid color="currentColor" size={20} />,
      },
      {
        path: '/http/middlewares',
        activeMatches: ['/http/middlewares/:name'],
        label: 'HTTP Middlewares',
        icon: <LiaCogsSolid color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'tcp',
    sectionLabel: 'TCP',
    items: [
      {
        path: '/tcp/routers',
        activeMatches: ['/tcp/routers/:name'],
        label: 'TCP Routers',
        icon: <LiaProjectDiagramSolid color="currentColor" size={20} />,
      },
      {
        path: '/tcp/services',
        activeMatches: ['/tcp/services/:name'],
        label: 'TCP Services',
        icon: <LiaServerSolid color="currentColor" size={20} />,
      },
      {
        path: '/tcp/middlewares',
        activeMatches: ['/tcp/middlewares/:name'],
        label: 'TCP Middlewares',
        icon: <LiaCogsSolid color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'udp',
    sectionLabel: 'UDP',
    items: [
      {
        path: '/udp/routers',
        activeMatches: ['/udp/routers/:name'],
        label: 'UDP Routers',
        icon: <LiaProjectDiagramSolid color="currentColor" size={20} />,
      },
      {
        path: '/udp/services',
        activeMatches: ['/udp/services/:name'],
        label: 'UDP Services',
        icon: <LiaServerSolid color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'certificates',
    sectionLabel: 'Certificates',
    items: [
      {
        path: '/certificates',
        activeMatches: ['/certificates/:name'],
        label: 'Certificates',
        icon: <LiaCertificateSolid color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'ai-gateway',
    sectionLabel: 'AI Gateway',
    items: [
      {
        path: '/ai',
        label: 'AI Gateway',
        icon: <MdOutlineSmartToy color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'mcp-gateway',
    sectionLabel: 'MCP Gateway',
    items: [
      {
        path: '/mcp',
        label: 'MCP Gateway',
        icon: <MdOutlineHub color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'security',
    sectionLabel: 'Security',
    items: [
      {
        path: '/security',
        label: 'Security',
        icon: <MdOutlineSecurity color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'api-management',
    sectionLabel: 'API Management',
    items: [
      {
        path: '/api-management',
        label: 'API Management',
        icon: <MdOutlineApi color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'config',
    sectionLabel: 'Configuration',
    items: [
      {
        path: '/config',
        label: 'Config Manager',
        icon: <MdOutlineSettings color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'distributed',
    sectionLabel: 'Distributed',
    items: [
      {
        path: '/distributed',
        label: 'Distributed',
        icon: <MdOutlineHub color="currentColor" size={20} />,
      },
    ],
  },
  {
    section: 'clusters',
    sectionLabel: 'Clusters',
    items: [
      {
        path: '/clusters',
        label: 'Multi-Cluster',
        icon: <MdOutlineApi color="currentColor" size={20} />,
      },
    ],
  },
]
