import { Button, Card, Flex, H2, Text, Badge } from '@traefik-labs/faency'
import { useState } from 'react'
import { FiClipboard, FiCheck } from 'react-icons/fi'
import useSWR from 'swr'

const API_BASE = (window as any).APIUrl || '/api'

async function fetchDashboards() {
  const res = await fetch(`${API_BASE}/grafana/dashboards`)
  if (!res.ok) return []
  return res.json()
}

export function GrafanaDashboards() {
  const { data: dashboards } = useSWR('grafana-dashboards', fetchDashboards)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (dashboard: any) => {
    const json = JSON.stringify(dashboard, null, 2)
    navigator.clipboard.writeText(json)
    setCopied(dashboard.uid)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Flex direction="column" gap={4}>
      <H2>Grafana Dashboards</H2>
      <Text css={{ color: '$textSubtle' }}>Pre-built Grafana dashboard definitions. Copy JSON and import into Grafana.</Text>

      {Array.isArray(dashboards) && dashboards.map((d: any) => (
        <Card key={d.uid} css={{ p: '$4' }}>
          <Flex justify="between" align="center">
            <Flex direction="column" gap={1}>
              <Text css={{ fontWeight: 600, fontSize: '$4' }}>{d.title}</Text>
              <Text css={{ color: '$textSubtle', fontSize: '$2' }}>{d.description}</Text>
              <Flex gap={1} css={{ mt: '$1' }}>
                <Badge>{d.panels?.length || 0} panels</Badge>
                <Badge variant="blue">{d.uid}</Badge>
              </Flex>
            </Flex>
            <Button
              size="small"
              variant={copied === d.uid ? 'green' : 'secondary'}
              onClick={() => handleCopy(d)}
            >
              {copied === d.uid ? <><FiCheck size={14} /> Copied!</> : <><FiClipboard size={14} /> Copy JSON</>}
            </Button>
          </Flex>

          {d.panels && (
            <Flex gap={1} wrap="wrap" css={{ mt: '$3' }}>
              {d.panels.map((p: any, i: number) => (
                <Badge key={i} variant="gray" css={{ fontSize: '$1' }}>{p.title} ({p.type})</Badge>
              ))}
            </Flex>
          )}
        </Card>
      ))}

      {(!dashboards || dashboards.length === 0) && (
        <Card css={{ p: '$4' }}>
          <Text css={{ color: '$textSubtle' }}>No dashboards available.</Text>
        </Card>
      )}
    </Flex>
  )
}
