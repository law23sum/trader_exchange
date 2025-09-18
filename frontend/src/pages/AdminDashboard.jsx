import React, { useEffect, useMemo, useState } from 'react'
import { fetchAuthed } from '../hooks/useAuth.js'
import { Section, Button, Pill, currency } from '../components/ui.js'

export default function AdminDashboard(){
  const [users, setUsers] = useState([])
  const [providers, setProviders] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try{
      const [uRes, pRes, lRes] = await Promise.all([
        fetchAuthed('/api/admin/users'),
        fetchAuthed('/api/players'),
        fetchAuthed('/api/listings')
      ])
      if (!uRes.ok) throw new Error('users')
      const usersJson = await uRes.json()
      const providersJson = pRes.ok ? await pRes.json() : []
      const listingsJson = lRes.ok ? await lRes.json() : []
      setUsers(Array.isArray(usersJson) ? usersJson : [])
      const providerList = Array.isArray(providersJson) ? providersJson : []
      setProviders(providerList.filter(p => String(p.role || '').toUpperCase() === 'PROVIDER'))
      const mappedListings = Array.isArray(listingsJson) ? listingsJson : []
      setListings(mappedListings.map(l => ({
        ...l,
        tags: typeof l.tags === 'string' ? l.tags.split(',').map(t => t.trim()).filter(Boolean) : Array.isArray(l.tags) ? l.tags : []
      })))
    }catch(e){
      setError('Failed to load admin data.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const listingsByProvider = useMemo(() => {
    const map = new Map()
    for (const listing of listings){
      const pid = String(listing.providerId || '')
      if (!pid) continue
      if (!map.has(pid)) map.set(pid, [])
      map.get(pid).push(listing)
    }
    return map
  }, [listings])

  const removeUser = async (id) => {
    if (!window.confirm('Remove this user?')) return
    try{
      const res = await fetchAuthed(`/api/admin/users/${id}`, { method:'DELETE' })
      if (!res.ok) throw new Error('failed')
      setUsers(prev => prev.filter(u => u.id !== id))
    }catch{
      alert('Could not delete user')
    }
  }

  const removeProvider = async (id) => {
    if (!window.confirm('Remove this provider and their listings?')) return
    try{
      const res = await fetchAuthed(`/api/admin/providers/${id}`, { method:'DELETE' })
      if (!res.ok) throw new Error('failed')
      setProviders(prev => prev.filter(p => String(p.id) !== String(id)))
      setListings(prev => prev.filter(l => String(l.providerId) !== String(id)))
    }catch{
      alert('Could not delete provider')
    }
  }

  const removeListing = async (id) => {
    if (!window.confirm('Delete this listing?')) return
    try{
      const res = await fetchAuthed(`/api/admin/listings/${id}`, { method:'DELETE' })
      if (!res.ok) throw new Error('failed')
      setListings(prev => prev.filter(l => String(l.id) !== String(id)))
    }catch{
      alert('Could not delete listing')
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin console</h1>
        <Button variant="ghost" onClick={load}>Refresh</Button>
      </div>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      {loading && <div className="text-sm text-gray-500 mb-3">Loading data…</div>}

      <Section title="Users" right={<span className="text-xs text-gray-500">{users.length}</span>}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Provider ID</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="py-2 pr-3">{u.name}</td>
                  <td className="py-2 pr-3">{u.email}</td>
                  <td className="py-2 pr-3">{String(u.role || '').toUpperCase()}</td>
                  <td className="py-2 pr-3">{u.providerPlayerId || <span className="text-gray-400">—</span>}</td>
                  <td className="py-2 pr-3">
                    <Button variant="danger" onClick={() => removeUser(u.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td className="py-3 text-sm text-gray-500" colSpan={5}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Providers" right={<span className="text-xs text-gray-500">{providers.length}</span>}>
        <div className="grid md:grid-cols-2 gap-3">
          {providers.map(p => {
            const list = listingsByProvider.get(String(p.id)) || []
            const specialties = Array.isArray(p.specialties) ? p.specialties : String(p.specialties || '').split(',').map(s => s.trim()).filter(Boolean)
            return (
              <div key={p.id} className="border rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.location || 'No location'} · ⭐ {p.rating ?? 0}</div>
                  </div>
                  <Button variant="danger" onClick={() => removeProvider(p.id)}>Delete</Button>
                </div>
                {p.bio && <div className="text-sm text-gray-600">{p.bio}</div>}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  {p.hourlyRate > 0 && <span>💵 ${Number(p.hourlyRate).toFixed(0)}/hr</span>}
                  {Number(p.experienceYears) > 0 && <span>🛠 {Number(p.experienceYears)} yrs</span>}
                  {p.availability && <span>🗓 {p.availability}</span>}
                </div>
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {specialties.slice(0, 6).map(s => <Pill key={s}>{s}</Pill>)}
                  </div>
                )}
                <div className="bg-gray-50 border rounded-2xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Listings ({list.length})</div>
                  <div className="space-y-2">
                    {list.map(l => (
                      <div key={l.id} className="border rounded-xl p-2">
                        <div className="text-sm font-medium">{l.title}</div>
                        <div className="text-xs text-gray-500">{currency(l.price)} · {l.status}</div>
                        {l.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{l.tags.map(t => <Pill key={t}>{t}</Pill>)}</div>}
                        <div className="mt-2">
                          <Button variant="ghost" onClick={() => removeListing(l.id)}>Delete listing</Button>
                        </div>
                      </div>
                    ))}
                    {list.length === 0 && <div className="text-xs text-gray-500">No active listings.</div>}
                  </div>
                </div>
              </div>
            )
          })}
          {providers.length === 0 && !loading && <div className="text-sm text-gray-500">No providers available.</div>}
        </div>
      </Section>

      <Section title="All listings" right={<span className="text-xs text-gray-500">{listings.length}</span>}>
        <div className="space-y-2">
          {listings.map(l => (
            <div key={l.id} className="border rounded-2xl p-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-sm">{l.title}</div>
                <div className="text-xs text-gray-500">Provider: {l.providerId || '—'} · {l.status}</div>
                <div className="text-xs text-gray-500">{currency(l.price)}</div>
              </div>
              <Button variant="danger" onClick={() => removeListing(l.id)}>Delete</Button>
            </div>
          ))}
          {listings.length === 0 && !loading && <div className="text-sm text-gray-500">No listings found.</div>}
        </div>
      </Section>
    </main>
  )
}
