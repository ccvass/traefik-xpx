import { X } from 'lucide-react'

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto', margin: 16 }} className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white"><X size={16} /></button>
        {children}
      </div>
    </div>
  )
}
