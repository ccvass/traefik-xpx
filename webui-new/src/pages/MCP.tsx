import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus } from 'lucide-react'
import type { Middleware } from '@/types/api'
import { AddForm, Item, Stat, mutateAll } from './shared'

export function MCPPage() {
  const { data: mws } = useSWR<Middleware[]>('/http/middlewares', fetcher)
  const all = mws || []
  const mcp = all.filter(m => ['tbac','mcpgovernance','mcppolicy','mcpaudit'].includes(m.type))
  const [adding, setAdding] = useState<string|null>(null)
  const [name, setName] = useState(''); const [json, setJson] = useState('')

  const templates: Record<string,unknown> = {
    tbac: { tbac: { rules: [{ agent: 'my-agent', tools: ['*'], scope: '*' }], defaultAction: 'deny' } },
    mcpaudit: { mcpaudit: { logFile: '/var/log/traefik/mcp-audit.json', includePayload: false } },
    mcppolicy: { mcppolicy: { rules: [{ name: 'default', action: 'allow', priority: 10 }] } },
  }
  const startAdd = (t: string) => { setAdding(t); setName(''); setJson(JSON.stringify(templates[t], null, 2)) }
  const save = async () => { try { await api.put(`/config/http/middlewares/${name}`, JSON.parse(json)); mutateAll(); setAdding(null) } catch {} }
  const del = (n: string) => { if(confirm(`Delete "${n}"?`)) api.del(`/config/http/middlewares/${n.replace(/@.*/,'')}`).then(mutateAll) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20}/></Link><h1 className="text-2xl font-bold">MCP Gateway</h1></div>
        <div className="flex gap-2">
          <button onClick={() => startAdd('tbac')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-xs font-semibold hover:bg-brand/20 border border-brand/20 hover:border-brand/40 transition-all"><Plus size={14}/>Add TBAC Rule</button>
          <button onClick={() => startAdd('mcpaudit')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-xs font-semibold hover:bg-brand/20 border border-brand/20 hover:border-brand/40 transition-all"><Plus size={14}/>Add Audit Logger</button>
          <button onClick={() => startAdd('mcppolicy')} className="flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-xs font-semibold hover:bg-brand/20 border border-brand/20 hover:border-brand/40 transition-all"><Plus size={14}/>Add Policy</button>
        </div>
      </div>
      {adding && <AddForm title={`New ${adding}`} name={name} setName={setName} json={json} setJson={setJson} color="brand" onSave={save} onCancel={() => setAdding(null)} disabled={!name} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value={mcp.length} label="MCP Middlewares" />
        <Stat value={mcp.filter(m=>m.type==='tbac').length ? 'Active' : 'Off'} label="TBAC Engine" />
        <Stat value={mcp.filter(m=>m.type==='mcpaudit').length ? 'Active' : 'Off'} label="Audit Logger" />
        <Stat value={mcp.filter(m=>m.type==='mcppolicy').length ? 'Active' : 'Off'} label="Policy Engine" />
      </div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Active MCP Middlewares ({mcp.length})</h2>
      {mcp.length ? <div className="space-y-2">{mcp.map(m => <Item key={m.name} name={m.name} detail={`${m.type} • ${m.status}`} editable={m.provider==='file'} onDelete={() => del(m.name)} />)}</div> : <p className="text-zinc-600 text-sm">No MCP middlewares. Use the buttons above to create one.</p>}
    </div>
  )
}
