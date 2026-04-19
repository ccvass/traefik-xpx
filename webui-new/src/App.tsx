import { HashRouter, Routes, Route } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/api'
import { Shell } from '@/components/layout/Shell'
import { DashboardPage } from '@/pages/Dashboard'
import { ConfigPage } from '@/pages/Config'
import { AIPage, MCPPage, SecurityPage, DistributedPage, APIMgmtPage } from '@/pages/Features'
import { ClustersPage, GrafanaPage, ProxyPage } from '@/pages/Operations'

export function App() {
  return (
    <SWRConfig value={{ fetcher, refreshInterval: 10000, revalidateOnFocus: true }}>
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/mcp" element={<MCPPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/distributed" element={<DistributedPage />} />
            <Route path="/api-mgmt" element={<APIMgmtPage />} />
            <Route path="/clusters" element={<ClustersPage />} />
            <Route path="/grafana" element={<GrafanaPage />} />
            <Route path="/proxy/*" element={<ProxyPage />} />
          </Routes>
        </Shell>
      </HashRouter>
    </SWRConfig>
  )
}
