import { Trash2, Save, X } from 'lucide-react'
import { TypeBadge, StatusBadge } from '@/components/Badge'
import { statAccent, editableAccent, btnStyle, COLORS } from '@/lib/design'
import { mutate } from 'swr'

function mutateAll() { mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares') }

function AddForm({ title, name, setName, json, setJson, color, onSave, onCancel, disabled }: {
  title: string; name: string; setName: (v: string) => void; json: string; setJson: (v: string) => void
  color: string; onSave: () => void; onCancel: () => void; disabled: boolean
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-3" style={editableAccent(color || COLORS.brand)}>
      <p className="font-semibold text-sm" style={{ color: color || COLORS.brand }}>{title}</p>
      <div>
        <label className="text-xs text-zinc-500">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. my-resource" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" />
      </div>
      <div>
        <label className="text-xs text-zinc-500">Configuration (JSON)</label>
        <textarea value={json} onChange={e => setJson(e.target.value)} rows={10} className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-xs font-mono outline-none leading-relaxed text-emerald-300 resize-y" style={{ borderColor: '#3f3f46' }} />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
        <button onClick={onSave} disabled={disabled} className="px-3 py-1.5 text-xs rounded-lg text-white font-semibold disabled:opacity-30 flex items-center gap-1" style={{ backgroundColor: color || COLORS.brand }}><Save size={12} />Create</button>
      </div>
    </div>
  )
}

function Item({ name, type, status, provider, onDelete }: { name: string; type?: string; status?: string; provider?: string; onDelete: () => void }) {
  const editable = provider === 'file'
  return (
    <div className="flex justify-between items-center p-4 rounded-lg border border-zinc-800 bg-zinc-900" style={editable ? editableAccent() : {}}>
      <div>
        <p className="font-medium text-sm text-zinc-200">{name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {type && <TypeBadge type={type} />}
          {status && <StatusBadge status={status} />}
          {provider && <span style={{ fontSize: 10, color: '#52525b' }}>{provider}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!editable && <span style={{ fontSize: 10, color: '#52525b', fontStyle: 'italic' }}>read-only</span>}
        {editable && <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>}
      </div>
    </div>
  )
}

function Stat({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5" style={color ? statAccent(color) : {}}>
      <p className="text-3xl font-bold text-zinc-100">{value}</p>
      <p style={{ fontSize: 10, color: '#71717a', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  )
}

function ActionBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all" style={btnStyle(color)}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> {label}
    </button>
  )
}

export { AddForm, Item, Stat, ActionBtn, mutateAll }
