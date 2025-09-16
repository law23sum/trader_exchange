import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Input, Button } from '../components/ui.js'
import { setToken } from '../hooks/useAuth.js'
import { isMock, mockFetch } from '../mock/api.js'

export default function SignUp({ onAuthed }){
  const [params] = useSearchParams()
  const defaultRole = params.get('role') === 'TRADER' ? 'TRADER' : 'USER'
  const [name, setName] = useState(params.get('name') || 'New User')
  const [email, setEmail] = useState(params.get('email') || 'new@example.com')
  const [password, setPassword] = useState('password')
  const [role, setRole] = useState(defaultRole)
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
      const res = await api('/api/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password, role }) })
      const data = await safeJson(res)
      if (!res.ok) { setError((data && (data.error || data.message)) || `Sign up failed (HTTP ${res.status})`); return; }
      setToken(data.token)
      await onAuthed?.()
      navigate(role === 'TRADER' ? '/dashboard/trader' : '/dashboard/user')
    }catch(e){ setError(`Could not reach the server${e?.name==='AbortError' ? ' (timeout)' : e?.message ? ` (${e.message})` : ''}.`) }
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
      <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
      <form className="space-y-3" onSubmit={submit}>
        <div><label className="text-xs text-gray-500">Full name</label><Input value={name} onChange={setName} placeholder="Taylor Doe" /></div>
        <div><label className="text-xs text-gray-500">Email</label><Input value={email} onChange={setEmail} placeholder="you@example.com" /></div>
        <div><label className="text-xs text-gray-500">Password</label><Input value={password} onChange={setPassword} type="password" placeholder="••••••••" /></div>
        <div>
          <label className="text-xs text-gray-500">I am a</label>
          <div className="flex flex-col sm:flex-row gap-2">
            {['USER','TRADER'].map(r => (
              <label key={r} className={`px-3 py-2 rounded-xl border cursor-pointer ${role===r?'bg-black text-white border-black':'bg-white'}`}>
                <input type="radio" className="hidden" checked={role===r} onChange={()=>setRole(r)} />{r}
              </label>
            ))}
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="submit">Sign up</Button>
          <Button variant="ghost" onClick={google} type="button">Continue with Google</Button>
        </div>
      </form>
      <div className="text-xs text-gray-500 mt-4">Already have an account? <Link to="/signin" className="underline">Sign in</Link></div>
    </main>
  )
}
