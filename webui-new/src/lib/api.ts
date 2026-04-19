import { toast } from 'sonner'
const BASE = '/api'

export function getToken(): string {
  return localStorage.getItem('token') || ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...init?.headers as Record<string, string> }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.reload()
    throw new Error('Unauthorized')
  }
  if (!res.ok) { toast.error(`Error: ${res.status} ${res.statusText}`); throw new Error(`${res.status} ${res.statusText}`) }
  return res.json()
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  put: <T,>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }).then(r => { toast.success('Saved'); return r }),
  del: <T,>(path: string) => request<T>(path, { method: 'DELETE' }).then(r => { toast.success('Deleted'); return r }),
  post: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }).then(r => { toast.success('Done'); return r }),
}

export function fetcher<T>(path: string): Promise<T> {
  return request<T>(path)
}

export async function logout(): Promise<void> {
  try { await api.post('/auth/logout') } catch {}
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.reload()
}
