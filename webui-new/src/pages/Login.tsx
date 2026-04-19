import { useState } from 'react'
import { Cpu } from 'lucide-react'

interface LoginPageProps {
  onLogin: (token: string, user: string) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        setError('Invalid credentials')
        return
      }
      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', data.user)
      onLogin(data.token, data.user)
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Cpu size={32} className="text-brand" />
          <h1 className="text-2xl font-bold text-white">Traefik-XPX</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide">Username</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              autoFocus autoComplete="username"
              className="w-full mt-1 rounded-lg px-4 py-3 text-sm outline-none transition-colors" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }}
              placeholder="admin"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full mt-1 rounded-lg px-4 py-3 text-sm outline-none transition-colors" style={{ backgroundColor: '#18181b', borderWidth: 1, borderStyle: 'solid', borderColor: '#3f3f46', color: '#e4e4e7' }}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading || !username || !password}
            className="w-full py-3 bg-brand hover:bg-brand/80 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-30"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-4">Enterprise API Gateway</p>
      </div>
    </div>
  )
}
