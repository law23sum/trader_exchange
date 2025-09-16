import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Input, Button } from '../components/ui.js'
import { setToken } from '../hooks/useAuth.js'
import { isMock, mockFetch } from '../mock/api.js'

export default function SignIn({ onAuthed }){
  const [email, setEmail] = useState('user@example.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const api = (path, opts={}) => {
    const base = import.meta.env.VITE_API_BASE || ''
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    if (isMock()) return mockFetch(path, opts)
    return fetch(`${base}${path}`, { ...opts, signal: ctrl.signal }).finally(()=>clearTimeout(t))
  }

  async function safeJson(res){
    try{
      return await res.json()
    }catch{
      try{ const txt = await res.clone().text(); return { message: txt } }catch{ return null }
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try{
      const res = await api('/api/signin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
      const data = await safeJson(res)
      if (!res.ok) { setError((data && (data.error || data.message)) || `Sign in failed (HTTP ${res.status})`); return; }
      setToken(data.token)
      await onAuthed?.()
      localStorage.setItem('tx_last_role', data.user.role);
      const u = data.user;
      const trader = (u.role==='TRADER') || u.isTrader || u.isProvider || u.providerId || u.providerPlayerId || (Array.isArray(u.roles)&&u.roles.includes('TRADER'));
      navigate(trader ? '/dashboard/trader' : '/dashboard/user')
    }catch (e){ setError(`Could not reach the server${e?.name==='AbortError' ? ' (timeout)' : e?.message ? ` (${e.message})` : ''}. Is the backend running?`) }
  }

  const google = async () => {
    try{
      if (isMock()){
        const res = await mockFetch('/api/auth/google', { method:'POST' })
        const data = await res.json()
        setToken(data.token)
        await onAuthed?.()
        localStorage.setItem('tx_last_role', data.user.role);
      const u = data.user;
      const trader = (u.role==='TRADER') || u.isTrader || u.isProvider || u.providerId || u.providerPlayerId || (Array.isArray(u.roles)&&u.roles.includes('TRADER'));
      navigate(trader ? '/dashboard/trader' : '/dashboard/user')
        return
      }
      window.location.href = '/api/auth/google/start'
    }catch(e){ setError('Google sign-in failed.') }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
      <form className="space-y-3" onSubmit={submit}>
        <div><label className="text-xs text-gray-500">Email</label><Input value={email} onChange={setEmail} placeholder="you@example.com" /></div>
        <div><label className="text-xs text-gray-500">Password</label><Input value={password} onChange={setPassword} type="password" placeholder="••••••••" /></div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="submit">Sign in</Button>
          <Button variant="ghost" onClick={google} type="button">Continue with Google</Button>
        </div>
      </form>
      <div className="text-xs text-gray-500 mt-4">
        Backend not running? <button type="button" className="underline" onClick={()=>{ localStorage.setItem('tx_mock','1'); alert('Demo mode enabled. Reloading…'); location.reload(); }}>Use demo mode (no backend)</button>
      </div>
      <div className="text-xs text-gray-500 mt-4">No account? <Link to="/signup" className="underline">Sign up</Link></div>
    </main>
  )
}
