import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { api } from '@/lib/api'
import { mutate } from 'swr'

function mutateAll() { mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares') }

// Reusable edit form — shows current JSON, allows editing, saves
export function EditForm({ title, endpoint, current, onDone }: { title: string; endpoint: string; current: unknown; onDone: () => void }) {
  const [json, setJson] = useState(JSON.stringify(current, null, 2))
  const save = async () => { try { await api.put(endpoint, JSON.parse(json)); mutateAll(); onDone() } catch {} }
  return (
    <div className="bg-zinc-900 border border-amber-900/30 rounded-xl p-5 space-y-3">
      <p className="font-semibold text-sm text-amber-400">Edit: {title}</p>
      <textarea value={json} onChange={e => setJson(e.target.value)} rows={8} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-brand" />
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
        <button onClick={save} className="px-3 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1"><Save size={12} />Save Changes</button>
      </div>
    </div>
  )
}

// Router form with middleware dropdown
export function RouterFormFull({ middlewares, onSave, onCancel }: { middlewares: string[]; onSave: (cfg: unknown) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [rule, setRule] = useState('')
  const [service, setService] = useState('')
  const [eps, setEps] = useState('web')
  const [selectedMw, setSelectedMw] = useState<string[]>([])
  const [tls, setTls] = useState(false)
  const [certResolver, setCertResolver] = useState('')

  const toggleMw = (mw: string) => setSelectedMw(prev => prev.includes(mw) ? prev.filter(m => m !== mw) : [...prev, mw])

  const save = () => {
    const cfg: Record<string, unknown> = {
      rule, service,
      entryPoints: eps.split(',').map(s => s.trim()),
    }
    if (selectedMw.length) cfg.middlewares = selectedMw
    if (tls) { cfg.tls = certResolver ? { certResolver } : {} }
    onSave({ name, config: cfg })
  }

  return (
    <div className="bg-zinc-900 border border-brand/30 rounded-xl p-5 space-y-3">
      <p className="font-semibold text-sm text-brand">New Route</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-zinc-500">Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="my-api" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" /></div>
        <div><label className="text-xs text-zinc-500">Service</label><input value={service} onChange={e => setService(e.target.value)} placeholder="backend-svc" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" /></div>
      </div>
      <div><label className="text-xs text-zinc-500">Rule</label><input value={rule} onChange={e => setRule(e.target.value)} placeholder="Host(`app.example.com`) && PathPrefix(`/api`)" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-zinc-500">Entry Points</label><input value={eps} onChange={e => setEps(e.target.value)} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" /></div>
        <div><label className="text-xs text-zinc-500">Cert Resolver (optional)</label><input value={certResolver} onChange={e => setCertResolver(e.target.value)} placeholder="le" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={tls} onChange={e => setTls(e.target.checked)} id="tls-check" className="rounded" />
        <label htmlFor="tls-check" className="text-xs text-zinc-400">Enable TLS</label>
      </div>
      {middlewares.length > 0 && <div>
        <label className="text-xs text-zinc-500">Middlewares (click to assign)</label>
        <div className="flex gap-1 flex-wrap mt-1">
          {middlewares.map(mw => (
            <button key={mw} onClick={() => toggleMw(mw)} className={`px-2 py-1 rounded text-[10px] transition-colors ${selectedMw.includes(mw) ? 'bg-brand text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{mw}</button>
          ))}
        </div>
        {selectedMw.length > 0 && <p className="text-[10px] text-brand mt-1">Selected: {selectedMw.join(', ')}</p>}
      </div>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
        <button onClick={save} disabled={!name || !rule || !service} className="px-3 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand/80 text-white font-semibold disabled:opacity-30 flex items-center gap-1"><Save size={12} />Create</button>
      </div>
    </div>
  )
}

// TLS cert upload form
export function CertUploadForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [cert, setCert] = useState('')
  const [key, setKey] = useState('')
  const save = async () => {
    await api.post('/certs/managed', { name, cert, key })
    mutate('/certs/managed')
    onDone()
  }
  return (
    <div className="bg-zinc-900 border border-brand/30 rounded-xl p-5 space-y-3">
      <p className="font-semibold text-sm text-brand">Upload TLS Certificate</p>
      <div><label className="text-xs text-zinc-500">Name (identifier)</label><input value={name} onChange={e => setName(e.target.value)} placeholder="my-domain" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" /></div>
      <div><label className="text-xs text-zinc-500">Certificate (PEM)</label><textarea value={cert} onChange={e => setCert(e.target.value)} rows={4} placeholder="-----BEGIN CERTIFICATE-----" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-brand" /></div>
      <div><label className="text-xs text-zinc-500">Private Key (PEM)</label><textarea value={key} onChange={e => setKey(e.target.value)} rows={4} placeholder="-----BEGIN PRIVATE KEY-----" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-brand" /></div>
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
        <button onClick={save} disabled={!name || !cert || !key} className="px-3 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand/80 text-white font-semibold disabled:opacity-30 flex items-center gap-1"><Save size={12} />Upload</button>
      </div>
    </div>
  )
}

// Static config section form (for ACME, entrypoints, providers, observability, AI, MCP)
export function StaticConfigForm({ section, title, fields, onDone }: {
  section: string; title: string
  fields: { key: string; label: string; type?: string; placeholder?: string; options?: string[] }[]
  onDone: () => void
}) {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const save = async () => {
    const data: Record<string, unknown> = {}
    for (const f of fields) {
      if (vals[f.key]) data[f.key] = f.type === 'boolean' ? vals[f.key] === 'true' : vals[f.key]
    }
    await fetch('/api/config/static?section=' + section, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(data),
    })
    setSaved(true)
    setTimeout(() => { setSaved(false); onDone() }, 1500)
  }

  return (
    <div className="bg-zinc-900 border border-brand/30 rounded-xl p-5 space-y-3">
      <p className="font-semibold text-sm text-brand">{title}</p>
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-xs text-zinc-500">{f.label}</label>
          {f.options ? (
            <select value={vals[f.key] || ''} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand">
              <option value="">Select...</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input value={vals[f.key] || ''} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} placeholder={f.placeholder} type={f.type === 'password' ? 'password' : 'text'} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" />
          )}
        </div>
      ))}
      <div className="flex gap-2 justify-end">
        {saved && <span className="text-emerald-400 text-xs self-center">Saved! Restart required.</span>}
        <button onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
        <button onClick={save} className="px-3 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand/80 text-white font-semibold flex items-center gap-1"><Save size={12} />Save</button>
      </div>
    </div>
  )
}
