import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PlayerBadge, Badge, Pill, Button, currency } from '../components/ui.js'
import { fetchAuthed } from '../hooks/useAuth.js'

function Tiers({ basePrice, listingId, providerId }){
  const tiers = [
    { name:'Basic', price: Math.round(basePrice*0.8), includes:['Core scope','3-day window'] },
    { name:'Standard', price: Math.round(basePrice*1.0), includes:['Full scope','2-day window','Messaging'] },
    { name:'Premium', price: Math.round(basePrice*1.4), includes:['Expanded scope','Priority','48h support'] },
  ];
  const navigate = useNavigate();
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {tiers.map(t => (
        <div key={t.name} className="border rounded-2xl p-3">
          <div className="font-medium">{t.name}</div>
          <div className="text-xl font-bold mt-1">{currency(t.price)}</div>
          <ul className="text-xs text-gray-600 mt-2 list-disc ml-4 space-y-1">{t.includes.map(i => <li key={i}>{i}</li>)}</ul>
          <Button onClick={() => navigate(`/confirm/${listingId}/${providerId}/${t.price}`)}>Select</Button>
        </div>
      ))}
    </div>
  )
}

export default function TraderDetailsPage(){
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get('selected');
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try{
        const res = await fetch(`/api/providers/${id}`);
        setData(await res.json());
      }catch{}
    })();
  }, [id]);

  if (!data) return <main className="max-w-6xl mx-auto px-4 py-6">Loading…</main>;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="flex items-center justify-between mb-4">
            <PlayerBadge player={data.provider} />
          </div>
          {(data.provider.bio || data.provider.location || data.provider.website || data.provider.phone || data.provider.specialties) && (
            <div className="border rounded-2xl p-4 mb-4 bg-white">
              {data.provider.bio && (<div className="text-sm text-gray-700 mb-2">{data.provider.bio}</div>)}
              <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                {data.provider.location && <div>📍 {data.provider.location}</div>}
                {data.provider.website && <a href={data.provider.website} target="_blank" rel="noreferrer" className="underline">🔗 Website</a>}
                {data.provider.phone && <div>📞 {data.provider.phone}</div>}
                {data.provider.hourlyRate > 0 && <div>💵 ${Number(data.provider.hourlyRate).toFixed(0)}/hr</div>}
                {data.provider.availability && <div>🗓 {data.provider.availability}</div>}
              </div>
              {data.provider.specialties && (
                <div className="flex flex-wrap gap-2 mt-2">{(data.provider.specialties||'').split(',').map(s=>s.trim()).filter(Boolean).map(s=><Pill key={s}>{s}</Pill>)}</div>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-gray-700 mt-2">
                {Number(data.provider.experienceYears)>0 && <div>🛠 {data.provider.experienceYears} yrs experience</div>}
                {(data.provider.languages||'').split(',').map(l=>l.trim()).filter(Boolean).length>0 && <div>🌐 {(data.provider.languages||'').split(',').map(l=>l.trim()).filter(Boolean).join(', ')}</div>}
                {data.provider.certifications && <div>🎓 {data.provider.certifications}</div>}
                {data.provider.socialTwitter && <a href={data.provider.socialTwitter} target="_blank" rel="noreferrer" className="underline">Twitter</a>}
                {data.provider.socialInstagram && <a href={data.provider.socialInstagram} target="_blank" rel="noreferrer" className="underline">Instagram</a>}
                {data.provider.portfolio && <a href={data.provider.portfolio} target="_blank" rel="noreferrer" className="underline">Portfolio</a>}
              </div>
              {(data.provider.sessionLength || data.provider.editedPhotos || data.provider.delivery || data.provider.turnaround || data.provider.styles || data.provider.equipment) && (
                <div className="mt-3 text-sm text-gray-800">
                  <div className="font-medium mb-1">Portrait session</div>
                  <div className="flex flex-wrap gap-3">
                    {data.provider.sessionLength && <div>⏱ {data.provider.sessionLength}</div>}
                    {Number(data.provider.editedPhotos)>0 && <div>🖼 {data.provider.editedPhotos} edited photos</div>}
                    {data.provider.delivery && <div>📦 {data.provider.delivery}</div>}
                    {data.provider.turnaround && <div>⚡ {data.provider.turnaround} turnaround</div>}
                    {data.provider.travelRadius && <div>🧭 {data.provider.travelRadius}</div>}
                    {data.provider.onLocation ? <div>🚗 On location</div> : null}
                    {data.provider.studioAvailable ? <div>🏢 Studio available</div> : null}
                  </div>
                  {(data.provider.styles||'').split(',').map(s=>s.trim()).filter(Boolean).length>0 && (
                    <div className="flex flex-wrap gap-2 mt-2">{(data.provider.styles||'').split(',').map(s=>s.trim()).filter(Boolean).map(s => <Pill key={s}>{s}</Pill>)}</div>
                  )}
                  {data.provider.equipment && <div className="text-xs text-gray-600 mt-2">Equipment: {data.provider.equipment}</div>}
                </div>
              )}
            </div>
          )}
          {data.listings.map(l => (
            <div key={l.id} className="border rounded-2xl p-4 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{l.title}</div>
                  <div className="text-sm text-gray-600">{l.description}</div>
                  <div className="flex flex-wrap gap-2 mt-2">{(l.tags||'').split(',').filter(Boolean).map(t => <Pill key={t}>{t}</Pill>)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{currency(l.price)}</div>
                  <Badge className="border-gray-300 text-gray-700">{l.status}</Badge>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm font-medium mb-1">Cost options</div>
                <Tiers basePrice={l.price} listingId={l.id} providerId={data.provider.id} />
              </div>
            </div>
          ))}
          {data.listings.length === 0 && <div className="text-sm text-gray-500">No active listings.</div>}
        </section>

        <aside className="grid gap-4">
          <EmbeddedChat providerId={data.provider.id} providerName={data.provider.name} />
        </aside>
      </div>
    </main>
  )
}

function EmbeddedChat({ providerId, providerName }){
  const [convId, setConvId] = React.useState(null)
  const [messages, setMessages] = React.useState([])
  const [text, setText] = React.useState('')

  async function ensureConv(){
    if (convId) return convId
    try{
      const res = await fetchAuthed('/api/conversations')
      if (res.ok){
        const list = await res.json()
        const found = (list||[]).find(c => (c.title||'').includes(providerName))
        if (found){ setConvId(found.id); return found.id }
      }
      const mk = await fetchAuthed('/api/conversations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'CHAT', title:`Chat with ${providerName}` }) })
      if (mk.ok){ const d = await mk.json(); setConvId(d.id); return d.id }
    }catch{}
    return null
  }

  async function load(){
    const id = await ensureConv()
    if (!id) return
    try{ const r = await fetchAuthed(`/api/conversations/${id}/messages`); if (r.ok) setMessages(await r.json()) }catch{}
  }

  React.useEffect(() => { load(); const iv = setInterval(load, 3000); return () => clearInterval(iv) }, [providerId, providerName])

  async function send(e){
    e?.preventDefault?.()
    if (!text.trim()) return
    const id = await ensureConv()
    if (!id) return
    try{
      const r = await fetchAuthed(`/api/conversations/${id}/messages`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: text }) })
      if (r.ok){ setText(''); load() }
    }catch{}
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="mb-2 text-lg font-semibold">Message {providerName}</h3>
      <div className="h-64 overflow-y-auto rounded-xl border p-2 bg-white/50">
        {messages.map(m => (
          <div key={m.id} className="mb-2">
            <div className="inline-block max-w-[80%] rounded-2xl px-3 py-2 text-sm bg-gray-100">{m.content}</div>
            <div className="mt-1 text-[10px] text-gray-500">{new Date(m.createdAt||Date.now()).toLocaleString()}</div>
          </div>
        ))}
        {messages.length===0 && <div className="text-sm text-gray-500">No messages yet. Say hello.</div>}
      </div>
      <form onSubmit={send} className="mt-2 flex flex-col sm:flex-row gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" className="flex-1 rounded-xl border p-2" />
        <button className="rounded-xl bg-black px-4 py-2 text-white w-full sm:w-auto" type="submit">Send</button>
      </form>
    </div>
  )
}

