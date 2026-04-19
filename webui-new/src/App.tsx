import { HashRouter, Routes, Route } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/api'
import { Shell } from '@/components/layout/Shell'
import { DashboardPage } from '@/pages/Dashboard'
import { PlaceholderPage } from '@/pages/Placeholder'

export function App() {
  return (
    <SWRConfig value={{ fetcher, refreshInterval: 10000, revalidateOnFocus: true }}>
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/proxy/*" element={<PlaceholderPage title="Proxy" description="HTTP/TCP/UDP routers, services, and middlewares" />} />
            <Route path="/ai" element={<PlaceholderPage title="AI Gateway" description="Multi-LLM routing, semantic cache, PII guard" />} />
            <Route path="/mcp" element={<PlaceholderPage title="MCP Gateway" description="Tool-Based Access Control, policies, audit" />} />
            <Route path="/security" element={<PlaceholderPage title="Security" description="WAF, authentication, OPA policies" />} />
            <Route path="/distributed" element={<PlaceholderPage title="Distributed" description="Rate limiting, HTTP cache, in-flight limits" />} />
            <Route path="/api-mgmt" element={<PlaceholderPage title="API Management" description="Developer portal, versioning, OpenAPI" />} />
            <Route path="/config" element={<PlaceholderPage title="Config Manager" description="Create, edit, delete configuration" />} />
            <Route path="/clusters" element={<PlaceholderPage title="Multi-Cluster" description="Manage multiple traefik-api-srv instances" />} />
            <Route path="/grafana" element={<PlaceholderPage title="Grafana Dashboards" description="Pre-built dashboard definitions" />} />
          </Routes>
        </Shell>
      </HashRouter>
    </SWRConfig>
  )
}
