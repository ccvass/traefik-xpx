import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus } from 'lucide-react'
import type { Middleware } from '@/types/api'
import { AddForm, Item, Stat, ActionBtn, mutateAll } from './shared'
import { COLORS, getCategoryColors } from '@/lib/design'

export function AIPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const all = mws || []
  const ai = all.filter(m => ['aigateway','semanticcache','piiguard','contentguard'].includes(m.type))
  const [adding, setAdding] = useState<string|null>(null)
  const [name, setName] = useState(''); const [json, setJson] = useState('')

  const templates: Record<string,unknown> = {
    semanticcache: { semanticCache: { ttl: 3600, maxEntries: 10000, similarityThreshold: 0.92 } },
    piiguard: { piiguard: { patterns: ['email','phone','ssn'], action: 'redact' } },
    aigateway: { aigateway: { provider: 'openai', model: 'gpt-4' } },
  }
  const startAdd = (t: string) => { setAdding(t); setName(''); setJson(JSON.stringify(templates[t], null, 2)) }
  const save = async () => { try { await api.put(`/config/http/middlewares/${name}`, JSON.parse(json)); mutateAll(); setAdding(null) } catch {} }
  const del = (n: string) => { if(confirm(`Delete "${n}"?`)) api.del(`/config/http/middlewares/${n.replace(/@.*/,'')}`).then(mutateAll) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20}/></Link><h1 className="text-2xl font-bold">AI Gateway</h1></div>
        <div className="flex gap-2">
          <ActionBtn label="Add AI Gateway" onClick={() => startAdd('aigateway')} color={COLORS.identity.accent} />
          <ActionBtn label="Add Semantic Cache" onClick={() => startAdd('semanticcache')} color={COLORS.cache.accent} />
          <ActionBtn label="Add PII Guard" onClick={() => startAdd('piiguard')} color={COLORS.security.accent} />
        </div>
      </div>
      {adding && <AddForm title={`New ${adding}`} name={name} setName={setName} json={json} setJson={setJson} color={getCategoryColors(adding || "").accent} onSave={save} onCancel={() => setAdding(null)} disabled={!name} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value={ai.length} label="AI Middlewares" color={COLORS.identity.accent} />
        <Stat value={ai.filter(m=>m.type==='semanticcache').length ? 'Active' : 'Off'} label="Semantic Cache" color={COLORS.cache.accent} />
        <Stat value={ai.filter(m=>m.type==='piiguard').length ? 'Active' : 'Off'} label="PII Guard" color={COLORS.security.accent} />
        <Stat value={ai.filter(m=>m.type==='aigateway').length ? 'Active' : 'Off'} label="Gateway" color={COLORS.brand} />
      </div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Active AI Middlewares ({ai.length})</h2>
      {ai.length ? <div className="space-y-2">{ai.map(m => <Item key={m.name} name={m.name} type={m.type} status={m.status} provider={m.provider} onDelete={() => del(m.name)} />)}</div> : <p className="text-zinc-600 text-sm">No AI middlewares. Use the buttons above to create one.</p>}
    </div>
  )
}
