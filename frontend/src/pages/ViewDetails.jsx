import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PlayerBadge, Pill, Badge, Button, currency } from '../components/ui.js'
import { fetchAuthed } from '../hooks/useAuth.js'

export default function ViewDetails(){
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = React.useState(null)
  const [reviews, setReviews] = React.useState([])
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    (async () => {
      try{
        const pid = encodeURIComponent(String(id||'').trim())
        const r = await fetch(`/api/providers/${pid}`)
        if (r.ok){
          const d = await r.json();
          if (d && d.provider) setData(d); else {
            // Fallback: try to locate provider from /api/players
            try{
              const p = await (await fetch('/api/players')).json()
              const found = (p||[]).find(x=>String(x.id)===String(id))
              if (found) setData({ provider: found, listings: [] }); else setError('No provider found')
            }catch{ setError('No provider found') }
          }
        } else {
          // Fallback to players
          try{
            const p = await (await fetch('/api/players')).json()
            const found = (p||[]).find(x=>String(x.id)===String(id))
            if (found) setData({ provider: found, listings: [] }); else setError('Could not load provider')
          }catch{ setError('Could not load provider') }
        }
      }catch(e){ setError('Could not load provider') }
      try{ const rv = await fetch(`/api/providers/${encodeURIComponent(String(id||''))}/reviews`); if (rv.ok) setReviews(await rv.json()) }catch{}
    })()
  }, [id])

  async function message(){
    try{
      const list = await (await fetchAuthed('/api/conversations')).json()
      let conv = (list||[]).find(c => (c.title||'').includes(data?.provider?.name||''))
      if (!conv){
        const mk = await fetchAuthed('/api/conversations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'CHAT', title:`Chat with ${data?.provider?.name||'Provider'}` }) })
        if (mk.ok) conv = await mk.json()
      }
      if (conv){ navigate(`/messages/${conv.id}`) } else { navigate('/messages') }
    }catch{ navigate('/messages') }
  }

  if (error) return <main className="max-w-6xl mx-auto px-4 py-6"><div className="text-sm text-red-600">{error}</div></main>
  if (!data) return <main className="max-w-6xl mx-auto px-4 py-6">Loading…</main>

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">View Details</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="flex items-center justify-between mb-4">
            <PlayerBadge player={data.provider} />
            <div className="text-right">
              {data.provider.location && <div className="text-xs text-gray-500">{data.provider.location}</div>}
              <Badge className="border-gray-300 text-gray-700">⭐ {Number(data.provider.rating||0).toFixed(1)}</Badge>
            </div>
          </div>

          {data.provider.bio && (
            <div className="border rounded-2xl p-4 mb-4 bg-white">
              <div className="text-sm text-gray-700 mb-2">{data.provider.bio}</div>
            </div>
          )}

          <div className="border rounded-2xl p-4 mb-4 bg-white">
            <div className="text-sm font-medium mb-2">Services offered</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {data.listings.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">{l.title}</td>
                    <td className="p-2">{l.status}</td>
                    <td className="p-2 text-right">{currency(l.price)}</td>
                  </tr>
                ))}
                {data.listings.length===0 && (<tr><td className="p-2 text-gray-500" colSpan={3}>No listings yet.</td></tr>)}
              </tbody>
            </table>
          </div>

          <div className="border rounded-2xl p-4 bg-white">
            <div className="text-sm font-medium mb-2">Reviews</div>
            <div className="space-y-2">
              {reviews.map(r => (
                <div key={r.id} className="border rounded-xl p-2">
                  <div className="text-xs text-gray-600">{r.author} · {new Date(r.at||Date.now()).toLocaleDateString()} · ⭐ {r.rating}</div>
                  <div className="text-sm">{r.text}</div>
                </div>
              ))}
              {reviews.length===0 && <div className="text-sm text-gray-500">No reviews yet.</div>}
            </div>
          </div>
        </section>

        <aside className="grid gap-4">
          <div className="border rounded-2xl p-3">
            {data.provider.phone && <div className="text-sm">Phone: <span className="font-medium">{data.provider.phone}</span></div>}
            {data.provider.availability && <div className="text-sm mt-1">Availability: <span className="font-medium">{data.provider.availability}</span></div>}
            {data.provider.website && <div className="text-sm mt-1"><a href={data.provider.website} className="underline" target="_blank" rel="noreferrer">Website</a></div>}
          </div>
          <div className="border rounded-2xl p-3">
            <div className="text-xs text-gray-500">Rating</div>
            <div className="text-xl font-semibold">{Number(data.provider.rating||0).toFixed(1)}</div>
          </div>
          <div className="border rounded-2xl p-3">
            <div className="text-xs text-gray-500">Jobs</div>
            <div className="text-xl font-semibold">{data.provider.jobs||0}</div>
          </div>
          <Button onClick={message}>Message trader</Button>
        </aside>
      </div>
    </main>
  )
}
