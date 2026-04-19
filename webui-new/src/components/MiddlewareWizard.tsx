import { useState } from 'react'
import { Save, X, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import { mutate } from 'swr'

function mutateAll() { mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares') }

const MW_STEPS: Record<string, { label: string; fields: { key: string; label: string; type?: string; placeholder?: string; default?: string }[] }> = {
  apiKey: { label: 'API Key Authentication', fields: [
    { key: 'headerName', label: 'Header Name', placeholder: 'X-API-Key', default: 'X-API-Key' },
    { key: 'keyValue', label: 'API Key Value', placeholder: 'your-secret-key' },
    { key: 'metadata', label: 'Key Metadata', placeholder: 'user-name', default: 'default' },
  ]},
  rateLimit: { label: 'Rate Limiting', fields: [
    { key: 'average', label: 'Requests per second', placeholder: '100', default: '100' },
    { key: 'burst', label: 'Burst size', placeholder: '50', default: '50' },
    { key: 'period', label: 'Period', placeholder: '1s', default: '1s' },
  ]},
  waf: { label: 'Web Application Firewall', fields: [
    { key: 'rules', label: 'SecRules', type: 'textarea', placeholder: 'SecRuleEngine On\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"', default: 'SecRuleEngine On\nSecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403"\nSecRule ARGS "@detectXSS" "id:2,phase:2,deny,status:403"' },
  ]},
  jwtAuth: { label: 'JWT Authentication', fields: [
    { key: 'jwksUrl', label: 'JWKS URL', placeholder: 'https://auth.example.com/.well-known/jwks.json' },
    { key: 'issuer', label: 'Issuer', placeholder: 'https://auth.example.com' },
    { key: 'audience', label: 'Audience (optional)', placeholder: 'my-api' },
  ]},
  circuitBreaker: { label: 'Circuit Breaker', fields: [
    { key: 'expression', label: 'Trip Expression', placeholder: 'NetworkErrorRatio() > 0.5', default: 'NetworkErrorRatio() > 0.5' },
  ]},
  retry: { label: 'Retry', fields: [
    { key: 'attempts', label: 'Max Attempts', placeholder: '3', default: '3' },
    { key: 'initialInterval', label: 'Initial Interval', placeholder: '100ms', default: '100ms' },
  ]},
  compress: { label: 'Compress', fields: [] },
  ipAllowList: { label: 'IP Allow List', fields: [
    { key: 'sourceRange', label: 'Allowed IPs (one per line)', type: 'textarea', placeholder: '10.0.0.0/8\n172.16.0.0/12\n192.168.0.0/16', default: '10.0.0.0/8\n172.16.0.0/12' },
  ]},
  redirectScheme: { label: 'Redirect to HTTPS', fields: [
    { key: 'scheme', label: 'Scheme', placeholder: 'https', default: 'https' },
    { key: 'permanent', label: 'Permanent (301)', placeholder: 'true', default: 'true' },
  ]},
  httpCache: { label: 'HTTP Cache', fields: [
    { key: 'defaultTtl', label: 'TTL', placeholder: '300s', default: '300s' },
    { key: 'maxEntries', label: 'Max Entries', placeholder: '5000', default: '5000' },
  ]},
}

function buildConfig(type: string, vals: Record<string, string>): unknown {
  switch (type) {
    case 'apiKey': return { apiKey: { headerName: vals.headerName || 'X-API-Key', keys: [{ value: vals.keyValue, metadata: vals.metadata || 'default' }] } }
    case 'rateLimit': return { rateLimit: { average: parseInt(vals.average) || 100, burst: parseInt(vals.burst) || 50, period: vals.period || '1s' } }
    case 'waf': return { waf: { inlineRules: vals.rules } }
    case 'jwtAuth': return { jwtAuth: { jwksUrl: vals.jwksUrl, issuer: vals.issuer, ...(vals.audience ? { audience: vals.audience } : {}) } }
    case 'circuitBreaker': return { circuitBreaker: { expression: vals.expression } }
    case 'retry': return { retry: { attempts: parseInt(vals.attempts) || 3, initialInterval: vals.initialInterval || '100ms' } }
    case 'compress': return { compress: {} }
    case 'ipAllowList': return { ipAllowList: { sourceRange: vals.sourceRange?.split('\n').filter(Boolean) || [] } }
    case 'redirectScheme': return { redirectScheme: { scheme: vals.scheme || 'https', permanent: vals.permanent === 'true' } }
    case 'httpCache': return { httpCache: { defaultTtl: vals.defaultTtl || '300s', maxEntries: parseInt(vals.maxEntries) || 5000 } }
    default: return {}
  }
}

export function MiddlewareWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0) // 0=type, 1=config, 2=preview
  const [type, setType] = useState('')
  const [name, setName] = useState('')
  const [vals, setVals] = useState<Record<string, string>>({})
  const [showYaml, setShowYaml] = useState(false)

  const config = type ? buildConfig(type, vals) : {}
  const yamlPreview = JSON.stringify(config, null, 2)

  const save = async () => {
    await api.put(`/config/http/middlewares/${name}`, config)
    mutateAll()
    onDone()
  }

  const selectType = (t: string) => {
    setType(t)
    const defaults: Record<string, string> = {}
    MW_STEPS[t]?.fields.forEach(f => { if (f.default) defaults[f.key] = f.default })
    setVals(defaults)
    setStep(1)
  }

  return (
    <div className="bg-zinc-900 border border-brand/30 rounded-xl p-5 space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {['Type', 'Configure', 'Review'].map((s, i) => (
          <div key={s} className={`flex items-center gap-1 ${i <= step ? 'text-brand' : 'text-zinc-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i <= step ? 'bg-brand text-white' : 'bg-zinc-800'}`}>{i + 1}</div>
            {s}
            {i < 2 && <div className={`w-8 h-px ${i < step ? 'bg-brand' : 'bg-zinc-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Select type */}
      {step === 0 && <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {Object.entries(MW_STEPS).map(([k, v]) => (
          <button key={k} onClick={() => selectType(k)} className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-left transition-all border border-zinc-700 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-0.5">
            <p className="text-sm font-medium">{v.label}</p>
          </button>
        ))}
      </div>}

      {/* Step 1: Configure */}
      {step === 1 && MW_STEPS[type] && <div className="space-y-3">
        <p className="font-semibold text-sm text-brand">{MW_STEPS[type].label}</p>
        <div>
          <label className="text-xs text-zinc-500">Middleware Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="my-middleware" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" />
        </div>
        {MW_STEPS[type].fields.map(f => (
          <div key={f.key}>
            <label className="text-xs text-zinc-500">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea value={vals[f.key] || ''} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} rows={8} placeholder={f.placeholder} className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-xs font-mono outline-none focus:border-brand leading-relaxed text-emerald-300 selection:bg-brand/30 resize-y" />
            ) : (
              <input value={vals[f.key] || ''} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" />
            )}
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <button onClick={() => setStep(0)} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700">Back</button>
          <button onClick={() => setStep(2)} disabled={!name} className="px-3 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand/80 text-white font-semibold disabled:opacity-30">Next</button>
        </div>
      </div>}

      {/* Step 2: Review + Preview */}
      {step === 2 && <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-sm text-brand">Review: {name}</p>
          <button onClick={() => setShowYaml(!showYaml)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"><Eye size={12} />{showYaml ? 'Hide' : 'Show'} JSON</button>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-xs">
          <p><span className="text-zinc-500">Type:</span> {MW_STEPS[type]?.label}</p>
          <p><span className="text-zinc-500">Name:</span> {name}</p>
          {Object.entries(vals).filter(([,v]) => v).map(([k, v]) => (
            <p key={k}><span className="text-zinc-500">{k}:</span> {v.length > 50 ? v.substring(0, 50) + '...' : v}</p>
          ))}
        </div>
        {showYaml && <pre className="bg-zinc-800 rounded-lg p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto">{yamlPreview}</pre>}
        <div className="flex gap-2 justify-end">
          <button onClick={() => setStep(1)} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700">Back</button>
          <button onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand/80 text-white font-semibold flex items-center gap-1"><Save size={12} />Create Middleware</button>
        </div>
      </div>}
    </div>
  )
}
