import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/api'
import { Shell } from '@/components/layout/Shell'
import { DashboardPage } from '@/pages/Dashboard'
import { LoginPage } from '@/pages/Login'
import { AIPage } from '@/pages/AI'
import { MCPPage } from '@/pages/MCP'
import { SecurityPage, DistributedPage, APIMgmtPage } from '@/pages/Features'
import { ClustersPage, GrafanaPage } from '@/pages/Operations'
import { GatewayPage } from '@/pages/Gateway'
import { UsersPage } from '@/pages/Users'
import { SettingsPage } from '@/pages/Settings'
import { LogsPage, MetricsPage, HealthPage } from '@/pages/Monitoring'

export function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(localStorage.getItem('user') || '')

  if (!token) {
    return <LoginPage onLogin={(t, u) => { setToken(t); setUser(u) }} />
  }

  return (
    <SWRConfig value={{ fetcher, refreshInterval: 10000, revalidateOnFocus: true }}>
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/mcp" element={<MCPPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/distributed" element={<DistributedPage />} />
            <Route path="/api-mgmt" element={<APIMgmtPage />} />
            <Route path="/clusters" element={<ClustersPage />} />
            <Route path="/grafana" element={<GrafanaPage />} />
            <Route path="/gateway" element={<GatewayPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </Shell>
      </HashRouter>
    </SWRConfig>
  )
}
