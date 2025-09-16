import React, { useEffect, useState } from 'react'
import { fetchAuthed, setToken } from '../hooks/useAuth.js'
import { Section, Pill, PlayerBadge, Button, Input } from '../components/ui.js'
import { Link, useNavigate } from 'react-router-dom'

export default function UserDashboard(){
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])
  const [categories, setCategories] = useState([])
  const [catQ, setCatQ] = useState('')

  useEffect(() => {
    (async () => {
      try{
        const m = await fetchAuthed('/api/me'); if (m.ok) setMe(await m.json())
        const f = await fetchAuthed('/api/user/favorites'); if (f.ok) setFavorites(await f.json())
        const h = await fetchAuthed('/api/user/history'); if (h.ok) setHistory(await h.json())
        const c = await fetch('/api/categories'); if (c.ok) setCategories(await c.json())
      }catch{}
    })()
  }, [])

  useEffect(() => {
    if (me && (me.role === 'TRADER' || me?.providerPlayerId)){
      navigate('/dashboard/trader', { replace: true })
    }
  }, [me])

  const filtered = categories.filter(c => !catQ || c.toLowerCase().includes(catQ.toLowerCase()))
  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-2xl font-semibold">Welcome{me ? `, ${me.name}` : ''}</h1>
        {me && me.role !== 'TRADER' && (
          <Button onClick={async ()=>{
            try{
              const r = await fetchAuthed('/api/become-provider', { method:'POST' })
              let data = null
              try{ data = await r.json() }catch{}
              if (r.ok){
                if (data?.token) setToken(data.token)
                window.location.href = '/dashboard/trader'
              } else {
                alert((data && (data.error || data.message)) || 'Could not upgrade to provider')
              }
            }catch{
              alert('Could not upgrade to provider')
            }
          }}>Become a provider</Button>
        )}
      </div>

      <Section title="Favorite traders" right={<span className="text-xs text-gray-500">{favorites.length}</span>}>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {favorites.map(f => (
            <Link key={f.provider.id} to={`/provider/${f.provider.id}`} className="border rounded-2xl p-3 block hover:bg-gray-50">
              <PlayerBadge player={f.provider} />
              <div className="text-xs text-gray-500 mt-1">{f.count} interactions</div>
            </Link>
          ))}
          {favorites.length === 0 && <div className="text-sm text-gray-500">No favorites yet.</div>}
        </div>
      </Section>

      <Section title="Recent interactions" right={<span className="text-xs text-gray-500">{history.length}</span>}>
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="border rounded-2xl p-3 flex items-center justify-between">
              <div className="text-sm"><span className="font-medium">{h.providerName}</span> — {h.note}</div>
              <div className="text-xs text-gray-500">{new Date(h.at).toLocaleString()}</div>
            </div>
          ))}
          {history.length === 0 && <div className="text-sm text-gray-500">No interactions yet.</div>}
        </div>
      </Section>

      <Section title="Browse by category" right={<div className='w-56'><Input value={catQ} onChange={setCatQ} placeholder='Filter categories' /></div>}>
        <div className="flex flex-wrap gap-2">
          {filtered.map(t => <Link key={t} to={`/results?q=${encodeURIComponent(t)}`}><Pill>{t}</Pill></Link>)}
          {filtered.length === 0 && <div className="text-sm text-gray-500">No categories match.</div>}
        </div>
      </Section>
    </main>
  )
}
