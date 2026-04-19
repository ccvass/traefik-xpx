import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Save, X } from 'lucide-react'
import type { Middleware, Router } from '@/types/api'
import { TypeBadge, StatusBadge, getTypeColor } from '@/components/Badge'

function mutateAll() { mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares') }

function AddForm({ title, name, setName, json, setJson, color, onSave, onCancel, disabled }: {
  title: string; name: string; setName: (v: string) => void; json: string; setJson: (v: string) => void
  color: string; onSave: () => void; onCancel: () => void; disabled: boolean
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-3" style={{ borderLeftWidth: 3, borderLeftColor: '#2AA2C1' }}>
      <p className="font-semibold text-sm" style={{ color: '#2AA2C1' }}>{title}</p>
      <div>
        <label className="text-xs text-zinc-500">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. my-middleware" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" />
      </div>
      <div>
        <label className="text-xs text-zinc-500">Configuration (JSON)</label>
        <textarea value={json} onChange={e => setJson(e.target.value)} rows={10} className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-xs font-mono outline-none focus:border-brand leading-relaxed text-emerald-300 selection:bg-brand/30 resize-y" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
        <button onClick={onSave} disabled={disabled} className="px-3 py-1.5 text-xs rounded-lg bg-brand hover:bg-brand/80 text-white font-semibold disabled:opacity-30 flex items-center gap-1"><Save size={12} />Create</button>
      </div>
    </div>
  )
}

function Item({ name, type, status, provider, onDelete }: { name: string; type?: string; status?: string; provider?: string; onDelete: () => void }) {
  const editable = provider === 'file'
  return (
    <div className="flex justify-between items-center p-4 rounded-lg border border-zinc-800 bg-zinc-900" style={editable ? { borderLeftWidth: 3, borderLeftColor: '#10b981' } : {}}>
      <div className="flex items-center gap-3">
        <div>
          <p className="font-medium text-sm">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            {type && <TypeBadge type={type} />}
            {status && <StatusBadge status={status} />}
            {provider && <span className="text-[10px] text-zinc-600">{provider}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!editable && <span className="text-[10px] text-zinc-600 italic">read-only</span>}
        {editable && <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>}
      </div>
    </div>
  )
}

function Stat({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" style={color ? { borderTopWidth: 3, borderTopColor: color } : {}}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}

export { AddForm, Item, Stat, mutateAll }
