import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { COLORS, statAccent } from '@/lib/design'
import { StatusBadge, StatusDot } from '@/components/Badge'
import { ArrowLeft, Plus, Trash2, Save, X } from 'lucide-react'
import { Modal } from '@/components/Modal'

export function ClustersPage() {
  const { data: overview } = useSWR('/overview', fetcher)
  const { data: entrypoints } = useSWR('/entrypoints', fetcher)
  const { data: version } = useSWR('/version', fetcher)
  const { data: cfg, mutate: m } = useSWR('cluster-cfg', () => fetch('/api/config/static?section=clusters', { credentials: 'include' }).then(r => r.ok ? r.json() : null))
  const [show, setShow] = useState(false)
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [region, setRegion] = useState('')
  const instances = cfg?.instances || []

  const add = async () => {
    await api.put('/config/static?section=clusters', { instances: [...instances, { name, url, region }] })
    m(); setShow(false); setName(''); setUrl(''); setRegion('')
  }
  const remove = async (i: number) => {
    if (!confirm(`Remove "${instances[i].name}"?`)) return
    await api.put('/config/static?section=clusters', { instances: instances.filter((_: unknown, j: number) => j !== i) }); m()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link><h1 className="text-2xl font-bold">Multi-Cluster</h1></div>
        <button onClick={() => setShow(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all" style={{ backgroundColor: '#2AA2C115', color: '#2AA2C1', borderWidth: 1, borderStyle: 'solid', borderColor: '#2AA2C130' }}><Plus size={14} />Add Instance</button>
      </div>

      {show && <Modal open={true} onClose={() => setShow(false)} color="#2AA2C1" size="sm">
          <p className="font-semibold text-lg mb-1" style={{ color: '#2AA2C1' }}>Add Cluster Instance</p>
          <p className="text-xs text-zinc-400 mb-3">Register a remote Traefik-XPX node for multi-cluster monitoring.</p>
          <div className="space-y-4">
            <div><label className="text-xs text-zinc-400 font-medium">Instance Name <span className="text-zinc-600 font-normal">— identifier (e.g. prod-us-east)</span></label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. prod-us-east" className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }} /></div>
            <div><label className="text-xs text-zinc-400 font-medium">API URL <span className="text-zinc-600 font-normal">— endpoint (e.g. https://node2:8099)</span></label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="e.g. https://node2:8099" className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }} /></div>
            <div><label className="text-xs text-zinc-400 font-medium">Region <span className="text-zinc-600 font-normal">— optional location tag (e.g. us-east-1)</span></label><input value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. us-east-1" className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }} /></div>
          </div>
          <div className="flex gap-2 justify-end mt-6"><button onClick={() => setShow(false)} className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700"><X size={14} className="inline mr-1" />Cancel</button><button onClick={add} disabled={!name||!url} className="px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-40" style={{ backgroundColor: '#2AA2C1' }}><Save size={14} className="inline mr-1" />Add Instance</button></div>
      </Modal>}

      <div className="glass p-6">
        <div className="flex justify-between items-center mb-4">
          <div><p className="font-bold text-lg">Current Instance</p><p className="text-sm text-zinc-500">{(version as any)?.Version || 'dev'}</p></div>
          <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#34d399' }}><span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} /> Healthy</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[['Routes', (overview as any)?.http?.routers?.total || 0, '#2AA2C1'], ['Services', (overview as any)?.http?.services?.total || 0, '#a855f7'], ['Middlewares', (overview as any)?.http?.middlewares?.total || 0, '#10b981'], ['Entrypoints', Array.isArray(entrypoints) ? entrypoints.length : 0, '#3b82f6']].map(([l, v, c]) => (
            <div key={l as string} className="bg-zinc-800 rounded-lg p-3" style={{ borderTopWidth: 3, borderTopStyle: 'solid', borderTopColor: c as string }}><p className="text-2xl font-bold">{v as number}</p><p className="text-[10px] text-zinc-500 uppercase">{l as string}</p></div>
          ))}
        </div>
      </div>

      {instances.map((inst: any, i: number) => (
        <div key={i} className="glass p-5 flex justify-between items-center">
          <div><p className="font-semibold">{inst.name}</p><p className="text-sm text-zinc-500">{inst.url} {inst.region && `• ${inst.region}`}</p></div>
          <div className="flex items-center gap-3"><StatusBadge status="enabled" /><button onClick={() => remove(i)} className="p-2 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 size={16} /></button></div>
        </div>
      ))}

      {!instances.length && !show && (
        <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-8 text-center">
          <p className="text-zinc-500">No remote instances. Click "Add Instance" to register other nodes.</p>
        </div>
      )}
    </div>
  )
}

export function GrafanaPage() {
  const { data: dashboards } = useSWR('/grafana/dashboards', fetcher)
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (d: any) => { navigator.clipboard.writeText(JSON.stringify(d, null, 2)); setCopied(d.uid); setTimeout(() => setCopied(null), 2000) }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link><h1 className="text-2xl font-bold">Grafana Dashboards</h1></div>
      <p className="text-sm text-zinc-500">Copy JSON and import into Grafana.</p>
      <div className="space-y-4">
        {Array.isArray(dashboards) && dashboards.map((d: any) => (
          <div key={d.uid} className="glass p-5 flex justify-between items-center">
            <div><p className="font-semibold">{d.title}</p><p className="text-sm text-zinc-500">{d.description}</p><p className="text-xs mt-1 flex items-center gap-2"><span style={{ color: '#71717a' }}>{d.panels?.length || 0} panels</span><span style={{ backgroundColor: '#2AA2C118', color: '#2AA2C1', borderRadius: 9999, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{d.uid}</span></p></div>
            <button onClick={() => copy(d)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={copied === d.uid ? { backgroundColor: '#10b981', color: '#fff' } : { backgroundColor: '#2AA2C115', color: '#2AA2C1', borderWidth: 1, borderStyle: 'solid', borderColor: '#2AA2C130' }}>{copied === d.uid ? 'Copied!' : 'Copy JSON'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProxyPage() {
  const location = useLocation()
  const proto = location.pathname.split('/proxy/')[1]?.split('/')[0] || 'http'
  const setProto = (p: string) => { window.location.hash = `/proxy/${p}` }
  const { data: routers } = useSWR(`/${proto}/routers`, fetcher)
  const { data: services } = useSWR(`/${proto}/services`, fetcher)
  const { data: middlewares } = useSWR(`/${proto}/middlewares`, fetcher)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link><h1 className="text-2xl font-bold">Proxy</h1></div>
      </div>

      <div className="flex border-b border-zinc-800">
        {['http', 'tcp', 'udp'].map(p => (
          <button key={p} onClick={() => setProto(p)} className={`px-4 py-2.5 text-sm font-semibold uppercase border-b-2 transition-colors ${proto === p ? 'border-brand text-brand' : 'border-transparent text-zinc-500 hover:text-white'}`}>{p}</button>
        ))}
      </div>

      {[['Routers', routers], ['Services', services], ...(proto !== 'udp' ? [['Middlewares', middlewares]] : [])].map(([title, data]) => (
        <div key={title as string}>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">{title as string} ({Array.isArray(data) ? data.length : 0})</h2>
          {Array.isArray(data) && data.length > 0 ? (
            <div className="space-y-2">
              {data.map((item: any) => (
                <div key={item.name} className={`flex justify-between items-center p-4 rounded-lg border ${item.provider === 'file' ? 'glass' : 'glass'}`}>
                  <div><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-zinc-500">{item.rule || item.type || item.status}</p></div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <span className="text-[10px] text-zinc-600">{item.provider}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-lg p-6 text-center text-zinc-500 text-sm">No {proto.toUpperCase()} {(title as string).toLowerCase()} configured</div>
          )}
        </div>
      ))}
    </div>
  )
}
