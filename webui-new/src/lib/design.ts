// Design system — all colors as inline styles to bypass Tailwind purging

export const COLORS = {
  brand: '#2AA2C1',
  // Category colors
  auth: { bg: '#f59e0b18', text: '#fbbf24', border: '#f59e0b40', accent: '#f59e0b' },
  security: { bg: '#ef444418', text: '#f87171', border: '#ef444440', accent: '#ef4444' },
  identity: { bg: '#a855f718', text: '#c084fc', border: '#a855f740', accent: '#a855f7' },
  traffic: { bg: '#3b82f618', text: '#60a5fa', border: '#3b82f640', accent: '#3b82f6' },
  resilience: { bg: '#f9731618', text: '#fb923c', border: '#f9731640', accent: '#f97316' },
  cache: { bg: '#06b6d418', text: '#22d3ee', border: '#06b6d440', accent: '#06b6d4' },
  network: { bg: '#10b98118', text: '#34d399', border: '#10b98140', accent: '#10b981' },
  redirect: { bg: '#0ea5e918', text: '#38bdf8', border: '#0ea5e940', accent: '#0ea5e9' },
  mock: { bg: '#ec489918', text: '#f472b6', border: '#ec489940', accent: '#ec4899' },
  utility: { bg: '#71717a18', text: '#a1a1aa', border: '#71717a40', accent: '#71717a' },
  // Status
  ok: { bg: '#10b98118', text: '#34d399', border: '#10b98140', accent: '#10b981' },
  error: { bg: '#ef444418', text: '#f87171', border: '#ef444440', accent: '#ef4444' },
  warning: { bg: '#f59e0b18', text: '#fbbf24', border: '#f59e0b40', accent: '#f59e0b' },
  off: { bg: '#71717a10', text: '#71717a', border: '#71717a30', accent: '#71717a' },
}

// Map middleware type to category
const TYPE_MAP: Record<string, keyof typeof COLORS> = {
  apikey: 'auth', basicauth: 'auth', digestauth: 'auth',
  waf: 'security',
  jwt: 'identity', jwtauth: 'identity', oidc: 'identity', hmac: 'identity', ldap: 'identity', forwardauth: 'identity',
  ratelimit: 'traffic', distributedratelimit: 'traffic', inflightreq: 'traffic', distributedInflightReq: 'traffic',
  circuitbreaker: 'resilience', retry: 'resilience',
  httpcache: 'cache', semanticcache: 'cache',
  ipallowlist: 'network', passtlsclientcert: 'network', tbac: 'network',
  redirectregex: 'redirect', redirectscheme: 'redirect',
  apimock: 'mock', piiguard: 'mock',
  stripprefix: 'utility', addprefix: 'utility', replacepath: 'utility', compress: 'utility',
  headers: 'utility', buffering: 'utility', chain: 'utility', stripprefixregex: 'utility',
  contenttype: 'utility', mcpaudit: 'utility', mcppolicy: 'utility', mcpgovernance: 'utility',
  aigateway: 'identity',
}

export function getCategoryColors(type: string) {
  const cat = TYPE_MAP[type.toLowerCase()] || 'utility'
  return COLORS[cat] || COLORS.utility
}

export function getStatusColors(status: string) {
  const s = status.toLowerCase()
  if (s === 'enabled' || s === 'healthy' || s === 'active' || s === 'on' || s === 'connected') return COLORS.ok
  if (s === 'disabled' || s === 'unhealthy' || s === 'error' || s === 'off') return COLORS.error
  if (s === 'warning' || s === 'degraded') return COLORS.warning
  return COLORS.off
}

// Badge styles
export const badgeStyle = (colors: { bg: string; text: string; border: string }): React.CSSProperties => ({
  backgroundColor: colors.bg,
  color: colors.text,
  borderColor: colors.border,
  borderWidth: 1,
  borderStyle: 'solid',
  borderRadius: 9999,
  padding: '3px 10px',
  fontSize: 10,
  fontWeight: 600,
  display: 'inline-block',
  lineHeight: '16px',
})

export const dotStyle = (color: string): React.CSSProperties => ({
  width: 8, height: 8, borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0,
})

export const statAccent = (color: string): React.CSSProperties => ({
  borderTopWidth: 3, borderTopStyle: 'solid', borderTopColor: color,
})

export const editableAccent = (color: string = '#10b981'): React.CSSProperties => ({
  borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: color,
})

export const btnStyle = (color: string): React.CSSProperties => ({
  backgroundColor: color + '15',
  color: color,
  borderColor: color + '30',
  borderWidth: 1,
  borderStyle: 'solid',
})
