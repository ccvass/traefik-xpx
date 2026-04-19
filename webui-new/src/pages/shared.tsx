import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Save, X } from 'lucide-react'
import type { Middleware, Router } from '@/types/api'

function mutateAll() { mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares') }

function AddForm({ title, name, setName, json, setJson, color, onSave, onCancel, disabled }: {
  title: string; name: string; setName: (v: string) => void; json: string; setJson: (v: string) => void
  color: string; onSave: () => void; onCancel: () => void; disabled: boolean
}) {
  return (
    <div className={`bg-zinc-900 border border-${color}-900/30 rounded-xl p-5 space-y-3`}>
      <p className={`font-semibold text-sm text-${color}-400`}>{title}</p>
      <div>
        <label className="text-xs text-zinc-500">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. my-middleware" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" />
      </div>
      <div>
        <label className="text-xs text-zinc-500">Configuration (JSON)</label>
        <textarea value={json} onChange={e => setJson(e.target.value)} rows={5} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-brand" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
        <button onClick={onSave} disabled={disabled} className={`px-3 py-1.5 text-xs rounded-lg bg-${color}-600 hover:bg-${color}-500 font-semibold disabled:opacity-30 flex items-center gap-1`}><Save size={12} />Create</button>
      </div>
    </div>
  )
}

function Item({ name, detail, editable, onDelete }: { name: string; detail: string; editable: boolean; onDelete: () => void }) {
  return (
    <div className={`flex justify-between items-center p-4 rounded-lg border ${editable ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900'}`}>
      <div><p className="font-medium text-sm">{name}</p><p className="text-xs text-zinc-500">{detail}</p></div>
      <div className="flex items-center gap-2">
        {!editable && <span className="text-[10px] text-zinc-600">read-only</span>}
        {editable && <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>}
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}

export { AddForm, Item, Stat, mutateAll }
