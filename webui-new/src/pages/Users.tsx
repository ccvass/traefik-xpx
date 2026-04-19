import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Save, X, Users } from 'lucide-react'
import { Modal } from '@/components/Modal'

export function UsersPage() {
  const { data: users, mutate } = useSWR<{ username: string }[]>('/auth/users', fetcher)
  const [show, setShow] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const add = async () => {
    await api.post('/auth/users', { username, password })
    mutate()
    setShow(false)
    setUsername('')
    setPassword('')
  }

  const remove = async (u: string) => {
    if (!confirm(`Delete user "${u}"?`)) return
    await api.del('/auth/users')
    // Need to send body with DELETE, use post workaround
    await fetch('/api/auth/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ username: u }),
    })
    mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-500 hover:text-white"><ArrowLeft size={20} /></Link>
          <Users size={24} className="text-brand" />
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>
        <button onClick={() => setShow(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all" style={{ backgroundColor: '#2AA2C115', color: '#2AA2C1', borderWidth: 1, borderStyle: 'solid', borderColor: '#2AA2C130' }}>
          <Plus size={14} />Add User
        </button>
      </div>

      {show && <Modal open={true} onClose={() => setShow(false)} color="#2AA2C1" size="sm">
          <p className="font-semibold text-lg mb-4" style={{ color: '#2AA2C1' }}>New User</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium">Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. operator" className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters" className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }} />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <button onClick={() => setShow(false)} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><X size={12} />Cancel</button>
            <button onClick={add} disabled={!username || !password} className="px-3 py-1.5 text-xs rounded-lg text-white font-semibold disabled:opacity-40 flex items-center gap-1" style={{ backgroundColor: '#2AA2C1' }}><Save size={12} />Create User</button>
          </div>
      </Modal>}

      <div className="space-y-2">
        {(users || []).map(u => (
          <div key={u.username} className="flex justify-between items-center p-4 glass">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#2AA2C120', color: '#2AA2C1' }}>
                {u.username[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{u.username}</p>
                <span style={{ backgroundColor: '#a855f718', color: '#c084fc', borderRadius: 9999, padding: '2px 8px', fontSize: 10, fontWeight: 600, borderWidth: 1, borderStyle: 'solid', borderColor: '#a855f740' }}>admin</span>
              </div>
            </div>
            <button onClick={() => remove(u.username)} className="p-1.5 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {(!users || users.length === 0) && !show && (
        <p className="text-zinc-600 text-sm">No users configured.</p>
      )}
    </div>
  )
}
