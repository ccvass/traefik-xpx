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
  geoip: 'network', botdetect: 'mock',
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
  backdropFilter: 'blur(4px)',
  boxShadow: `0 2px 8px ${colors.bg}`,
})

export const dotStyle = (color: string): React.CSSProperties => ({
  width: 8, height: 8, borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0,
})

export const statAccent = (color: string): React.CSSProperties => ({
  borderTopWidth: 3, borderTopStyle: 'solid', borderTopColor: color,
  background: `linear-gradient(135deg, ${color}08 0%, #18181b 100%)`,
  boxShadow: `0 4px 24px ${color}10`,
})

export const editableAccent = (color: string = '#10b981'): React.CSSProperties => ({
  borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: color,
  background: `linear-gradient(135deg, ${color}06 0%, #18181b 100%)`,
})

export const btnStyle = (color: string): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
  color: color,
  borderColor: color + '40',
  borderWidth: 1,
  borderStyle: 'solid',
  boxShadow: `0 2px 12px ${color}15`,
})

// Glass card base
export const glassCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
  backdropFilter: 'blur(12px)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.06)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
}

export const glassCardHover: React.CSSProperties = {
  ...glassCard,
  borderColor: 'rgba(255,255,255,0.12)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
}

// Human-readable type names for modal titles
export const TYPE_LABELS: Record<string, string> = {
  waf: 'WAF Rule', apikey: 'API Key', jwt: 'JWT Auth', oidc: 'OIDC Provider', hmac: 'HMAC Auth',
  ratelimit: 'Rate Limiter', httpcache: 'HTTP Cache', inflightreq: 'In-Flight Limiter',
  aigateway: 'AI Gateway', semanticcache: 'Semantic Cache', piiguard: 'PII Guard',
  tbac: 'TBAC Rule', mcpaudit: 'Audit Logger', mcppolicy: 'MCP Policy', mcpgovernance: 'MCP Governance',
  apimock: 'API Mock', router: 'API Route', basicauth: 'Basic Auth',
  geoip: 'GeoIP Block', botdetect: 'Bot Detect',
}
export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1)
}

// Tooltip help text for each middleware/resource type
export const TYPE_HELP: Record<string, { desc: string; fields: string }> = {
  waf: {
    desc: 'Web Application Firewall — blocks SQLi, XSS, bot attacks using ModSecurity/Coraza rules.',
    fields: 'inlineRules: SecRule syntax. Example:\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"\nSecRule ARGS "@detectXSS" "id:2,phase:2,deny,status:403"\nSecRule REQUEST_URI "@contains /admin" "id:3,phase:1,deny,status:403"',
  },
  apikey: {
    desc: 'API Key Authentication — validates requests via a header key.',
    fields: 'headerName: Header to check (e.g. "X-API-Key")\nkeys[].value: The API key string\nkeys[].metadata: Label for the key owner (e.g. "mobile-app")',
  },
  jwt: {
    desc: 'JWT Token Validation — verifies tokens against a JWKS endpoint.',
    fields: 'jwksUrl: URL to JWKS endpoint (e.g. "https://auth.example.com/.well-known/jwks.json")\nissuer: Expected token issuer (e.g. "https://auth.example.com")',
  },
  oidc: {
    desc: 'OpenID Connect — full OAuth2/OIDC authentication flow.',
    fields: 'issuerUrl: OIDC provider URL (e.g. "https://accounts.google.com")\nclientId: Your app client ID\nclientSecret: Your app client secret\nredirectUrl: Callback URL (e.g. "https://app.example.com/callback")',
  },
  hmac: {
    desc: 'HMAC Signature Verification — validates request signatures.',
    fields: 'secret: Shared secret key\nalgorithm: "sha256" or "sha512"\nheaderName: Header containing the signature (e.g. "X-Signature")',
  },
  ratelimit: {
    desc: 'Rate Limiting — limits requests per client to prevent abuse.',
    fields: 'average: Requests allowed per period (e.g. 100)\nburst: Max spike above average (e.g. 50)\nperiod: Time window (e.g. "1s", "1m", "1h")',
  },
  httpcache: {
    desc: 'HTTP Response Cache — caches backend responses to reduce load.',
    fields: 'defaultTtl: Cache duration (e.g. "300s" = 5 minutes)\nmaxEntries: Max cached items (e.g. 5000)',
  },
  inflightreq: {
    desc: 'In-Flight Request Limiter — limits concurrent requests to backend.',
    fields: 'amount: Max simultaneous requests (e.g. 100)',
  },
  aigateway: {
    desc: 'AI Gateway — routes and manages LLM API calls with caching and guardrails.',
    fields: 'provider: LLM provider ("openai", "anthropic", "ollama")\nmodel: Model name (e.g. "gpt-4", "claude-3-opus")',
  },
  semanticcache: {
    desc: 'Semantic Cache — caches similar LLM queries using vector similarity.',
    fields: 'ttl: Cache duration in seconds (e.g. 3600)\nmaxEntries: Max cached queries (e.g. 10000)\nsimilarityThreshold: 0.0-1.0, higher = stricter match (e.g. 0.92)',
  },
  piiguard: {
    desc: 'PII Guard — detects and redacts personal data (emails, phones, SSNs) in requests.',
    fields: 'patterns: Array of PII types to detect ["email", "phone", "ssn"]\naction: "redact" (replace with ***) or "block" (reject request)',
  },
  tbac: {
    desc: 'Tool-Based Access Control — controls which MCP agents can use which tools.',
    fields: 'rules[].agent: Agent name or pattern\nrules[].tools: Array of allowed tools (["*"] for all)\nrules[].scope: Access scope\ndefaultAction: "allow" or "deny" when no rule matches',
  },
  mcpaudit: {
    desc: 'MCP Audit Logger — logs all tool calls for compliance and debugging.',
    fields: 'logFile: Path to audit log (e.g. "/var/log/traefik/mcp-audit.json")\nincludePayload: true/false — log request/response bodies',
  },
  mcppolicy: {
    desc: 'MCP Policy Engine — governance rules for MCP tool usage.',
    fields: 'rules[].name: Rule identifier\nrules[].action: "allow" or "deny"\nrules[].priority: Number (higher = evaluated first)',
  },
  apimock: {
    desc: 'API Mock — returns mock responses based on an OpenAPI specification.',
    fields: 'specFile: Path to OpenAPI YAML/JSON (e.g. "/etc/traefik/specs/api.yaml")\ndefaultStatus: HTTP status for unmatched routes (e.g. 200)',
  },
  router: {
    desc: 'HTTP Router — routes incoming requests to a backend service based on rules.',
    fields: 'rule: Matching rule (e.g. "Host(`app.example.com`) && PathPrefix(`/api`)")\nservice: Target service name\nentryPoints: ["web", "websecure"]\nmiddlewares: ["auth", "rate-limit"] (optional)',
  },
  service: {
    desc: 'Backend Service — load balancer with health checks.',
    fields: 'loadBalancer.servers[].url: Backend URL (e.g. "http://10.0.0.1:8080")\nhealthCheck.path: Health endpoint (e.g. "/health")\nhealthCheck.interval: Check frequency (e.g. "10s")',
  },
  user: {
    desc: 'Dashboard User — JWT-authenticated access to the Traefik-XP dashboard.',
    fields: 'username: Unique login name\npassword: Minimum 8 characters, stored as bcrypt hash',
  },
  geoip: {
    desc: 'GeoIP Blocking — block or allow traffic by country using MaxMind GeoLite2 database.',
    fields: 'databaseFile: Path to GeoLite2-Country.mmdb\nallowCountries: Whitelist (e.g. ["PE","CO","CL","MX"])\nblockCountries: Blacklist (e.g. ["RU","CN"])\ntrustForwardedFor: true if behind Cloudflare/CDN',
  },
  botdetect: {
    desc: 'Bot Detection — blocks scrapers, vulnerability scanners, and automated attacks by User-Agent and request rate.',
    fields: 'blockKnownBots: true to block known malicious UAs (sqlmap, nikto, scrapy)\nallowGoodBots: true to allow Googlebot, Bingbot, Cloudflare\nrateThreshold: Max requests/minute per IP (e.g. 60)\nchallengeMode: true returns 429 instead of 403',
  },
  cluster: {
    desc: 'Remote Instance — register another Traefik-XP node for multi-cluster monitoring.',
    fields: 'name: Identifier (e.g. "prod-us-east")\nurl: API endpoint (e.g. "https://node2:8099")\nregion: Optional location tag (e.g. "us-east-1")',
  },
}
