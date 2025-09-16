import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setToken } from '../hooks/useAuth.js'

export default function AuthCallback(){
  const [params] = useSearchParams()
  const navigate = useNavigate()
  useEffect(() => {
    const t = params.get('token')
    if (t){
      setToken(t)
      // route by role
      fetch('/api/me', { headers:{ Authorization:`Bearer ${t}` } }).then(async r => {
        if (r.ok){ const u = await r.json(); navigate((u.role === 'TRADER' || u?.providerPlayerId) ? '/dashboard/trader' : '/dashboard/user') }
        else navigate('/dashboard/user')
      }).catch(()=> navigate('/dashboard/user'))
    } else {
      navigate('/signin')
    }
  }, [])
  return <main className="max-w-xl mx-auto px-4 py-10">Completing sign in…</main>
}
