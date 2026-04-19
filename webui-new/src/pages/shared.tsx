import { Trash2, Save, X } from 'lucide-react'
import { TypeBadge, StatusBadge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { statAccent, editableAccent, btnStyle, glassCard, COLORS, TYPE_HELP } from '@/lib/design'
import { mutate } from 'swr'

function mutateAll() { mutate('/http/routers'); mutate('/http/services'); mutate('/http/middlewares') }

function AddForm({ title, name, setName, json, setJson, color, onSave, onCancel, disabled, typeKey }: {
  title: string; name: string; setName: (v: string) => void; json: string; setJson: (v: string) => void
  color: string; onSave: () => void; onCancel: () => void; disabled: boolean; typeKey?: string
}) {
  const help = typeKey ? TYPE_HELP[typeKey] : null
  return (
    <Modal open={true} onClose={onCancel} color={color}>
      <p className="font-semibold text-lg mb-1" style={{ color: color || COLORS.brand }}>{title}</p>
      {help && <p className="text-xs text-zinc-400 mb-1">{help.desc}</p>}
      {!help && <p className="text-xs text-zinc-500 mb-1">Fill in a unique name and edit the JSON configuration.</p>}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-400 font-medium">Name <span className="text-zinc-600 font-normal">— unique identifier, lowercase, no spaces (e.g. my-{typeKey || 'resource'})</span></label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. my-${typeKey || 'resource'}`} className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 font-medium">Configuration (JSON)</label>
          {help && <pre className="text-[10px] text-zinc-600 mt-1 mb-1 whitespace-pre-wrap leading-relaxed">{help.fields}</pre>}
          <textarea value={json} onChange={e => setJson(e.target.value)} rows={10} className="w-full mt-1 rounded-lg px-4 py-3 text-xs font-mono outline-none leading-relaxed resize-y" style={{ backgroundColor: '#09090b', borderWidth: 1, borderStyle: 'solid', borderColor: '#27272a', color: '#34d399', minHeight: 200 }} />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
          <button onClick={onSave} disabled={disabled} className="px-3 py-1.5 text-xs rounded-lg text-white font-semibold disabled:opacity-30 flex items-center gap-1" style={{ backgroundColor: color || COLORS.brand }}><Save size={12} />Create</button>
        </div>
      </div>
    </Modal>
  )
}

function Item({ name, type, status, provider, onDelete }: { name: string; type?: string; status?: string; provider?: string; onDelete: () => void }) {
  const editable = provider === 'file'
  return (
    <div className="flex justify-between items-center p-4" style={{ ...glassCard, borderRadius: 12, ...(editable ? editableAccent() : {}) }}>
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
    <div style={{ ...glassCard, padding: 20, ...(color ? statAccent(color) : {}) }}>
      <p style={{ fontSize: 28, fontWeight: 800, color: color || '#e4e4e7', textShadow: color ? `0 0 20px ${color}40` : 'none' }}>{value}</p>
      <p style={{ fontSize: 10, color: '#71717a', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  )
}

function ActionBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105" style={btnStyle(color)}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> {label}
    </button>
  )
}

export { AddForm, Item, Stat, ActionBtn, mutateAll }
