import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { PlayerBadge, Badge, Pill, Button, Input, currency } from '../components/ui.js'
import { JourneyStepper } from '../components/JourneyStepper.jsx'
import { fetchAuthed } from '../hooks/useAuth.js'

function Tiers({ basePrice, listingId, providerId, onSelect }){
  const tiers = [
    { name:'Basic', price: Math.round(basePrice*0.8), includes:['Core scope','3-day window'] },
    { name:'Standard', price: Math.round(basePrice*1.0), includes:['Full scope','2-day window','Messaging'] },
    { name:'Premium', price: Math.round(basePrice*1.4), includes:['Expanded scope','Priority','48h support'] },
  ];
  const navigate = useNavigate();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tiers.map(t => (
        <div key={t.name} className="tx-card space-y-3 p-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">{t.name}</div>
          <div className="text-2xl font-semibold text-gray-900">{currency(t.price)}</div>
          <ul className="ml-4 list-disc space-y-1 text-sm text-gray-600">{t.includes.map(i => <li key={i}>{i}</li>)}</ul>
          <Button
            className="w-full"
            onClick={() => {
              onSelect?.()
              navigate(`/confirm/${listingId}/${providerId}/${t.price}`)
            }}
          >
            Select
          </Button>
        </div>
      ))}
    </div>
  )
}

export default function TraderDetailsPage(){
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get('selected');
  const shouldPrefillConsult = searchParams.get('consult');
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [me, setMe] = useState(undefined);
  const [conversationId, setConversationId] = useState(null);
  const [consultDate, setConsultDate] = useState('');
  const [consultTime, setConsultTime] = useState('');
  const [consultNote, setConsultNote] = useState('');
  const [consultSubmitting, setConsultSubmitting] = useState(false);
  const [activeListingId, setActiveListingId] = useState(selectedId || '');
  const [showConsultCard, setShowConsultCard] = useState(Boolean(shouldPrefillConsult));
  const [consultFeedback, setConsultFeedback] = useState('');

  useEffect(() => {
    (async () => {
      try{
        const res = await fetch(`/api/providers/${id}`);
        setData(await res.json());
      }catch{}
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try{
        const res = await fetchAuthed('/api/me');
        if (res.ok){
          setMe(await res.json());
        } else {
          setMe(null);
        }
      }catch{
        setMe(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (!data?.listings?.length) return;
    const normalized = selectedId ? String(selectedId) : '';
    if (normalized && normalized !== activeListingId && data.listings.some(l => String(l.id) === normalized)){
      setActiveListingId(normalized);
      return;
    }
    if (!normalized && !activeListingId){
      setActiveListingId(String(data.listings[0].id));
    }
  }, [data?.listings, selectedId, activeListingId]);

  useEffect(() => {
    if (shouldPrefillConsult && !showConsultCard){
      setShowConsultCard(true);
    }
  }, [shouldPrefillConsult, showConsultCard]);

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId
    if (!data?.provider?.id) return null
    const id = await ensureConversationWithProvider(data.provider.id, data.provider.name)
    if (id) setConversationId(id)
    return id
  }, [conversationId, data?.provider?.id, data?.provider?.name])

  const activeListing = data?.listings?.find((l) => String(l.id) === String(activeListingId)) || data?.listings?.[0];

  const sendConsultation = async (e) => {
    e?.preventDefault?.();
    setConsultFeedback('');
    if (!data?.provider || !activeListing) return;
    if (me === undefined){
      setConsultFeedback('Checking your session. Please try again in a moment.');
      return;
    }
    if (!me){
      navigate(`/signin?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setConsultSubmitting(true);
    try{
      const convId = await ensureConversation();
      const payload = {
        providerId: data.provider.id,
        listingId: activeListing.id,
        title: `Consultation: ${activeListing.title}`,
        details: consultNote,
        date: consultDate,
        time: consultTime,
        conversationId: convId,
      };
      const res = await fetchAuthed('/api/orders/request', { method:'POST', body: JSON.stringify(payload) });
      if (res.status === 401){
        setMe(null);
        setConsultFeedback('Please sign in to send a consultation request.');
        return;
      }
      if (res.ok){
        setConsultFeedback('Consultation request sent. We will notify you in Messages once the trader responds.');
        setConsultNote('');
      } else {
        let err = 'Unable to send request. Try again shortly.';
        try{ const data = await res.json(); err = data?.error || data?.message || err; }catch{}
        setConsultFeedback(err);
      }
    }catch{
      setConsultFeedback('Unable to send request. Check your connection and try again.');
    }finally{
      setConsultSubmitting(false);
    }
  };

  if (!data) return <main className="tx-container py-10 text-sm text-gray-500">Loading…</main>;

  return (
    <main className="tx-container space-y-8 py-10">
      <JourneyStepper stage="consult" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <PlayerBadge player={data.provider} />
          </div>
          {(data.provider.bio || data.provider.location || data.provider.website || data.provider.phone || data.provider.specialties) && (
            <div className="tx-card space-y-4 p-6">
              {data.provider.bio && (<p className="text-sm text-gray-600">{data.provider.bio}</p>)}
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
                {data.provider.location && <div>📍 {data.provider.location}</div>}
                {data.provider.website && <a href={data.provider.website} target="_blank" rel="noreferrer" className="underline">🔗 Website</a>}
                {data.provider.phone && <div>📞 {data.provider.phone}</div>}
                {data.provider.hourlyRate > 0 && <div>💵 ${Number(data.provider.hourlyRate).toFixed(0)}/hr</div>}
                {data.provider.availability && <div>🗓 {data.provider.availability}</div>}
              </div>
              {data.provider.specialties && (
                <div className="flex flex-wrap gap-2">{(data.provider.specialties||'').split(',').map(s=>s.trim()).filter(Boolean).map(s=><Pill key={s}>{s}</Pill>)}</div>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                {Number(data.provider.experienceYears)>0 && <div>🛠 {data.provider.experienceYears} yrs experience</div>}
                {(data.provider.languages||'').split(',').map(l=>l.trim()).filter(Boolean).length>0 && <div>🌐 {(data.provider.languages||'').split(',').map(l=>l.trim()).filter(Boolean).join(', ')}</div>}
                {data.provider.certifications && <div>🎓 {data.provider.certifications}</div>}
                {data.provider.socialTwitter && <a href={data.provider.socialTwitter} target="_blank" rel="noreferrer" className="underline">Twitter</a>}
                {data.provider.socialInstagram && <a href={data.provider.socialInstagram} target="_blank" rel="noreferrer" className="underline">Instagram</a>}
                {data.provider.portfolio && <a href={data.provider.portfolio} target="_blank" rel="noreferrer" className="underline">Portfolio</a>}
              </div>
              {(data.provider.sessionLength || data.provider.editedPhotos || data.provider.delivery || data.provider.turnaround || data.provider.styles || data.provider.equipment) && (
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Portrait session</div>
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
                    <div className="flex flex-wrap gap-2">{(data.provider.styles||'').split(',').map(s=>s.trim()).filter(Boolean).map(s => <Pill key={s}>{s}</Pill>)}</div>
                  )}
                  {data.provider.equipment && <div className="text-xs text-gray-500">Equipment: {data.provider.equipment}</div>}
                </div>
              )}
            </div>
          )}
          {data.listings.map(l => {
            const isActive = String(l.id) === String(activeListing?.id)
            return (
              <div key={l.id} className={`tx-card space-y-4 p-6 transition ${isActive ? 'border-gray-900 shadow-lg' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-gray-900">{l.title}</div>
                      {isActive && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-600">Selected</Badge>}
                    </div>
                    <p>{l.description}</p>
                    <div className="flex flex-wrap gap-2">{(l.tags||'').split(',').filter(Boolean).map(t => <Pill key={t}>{t}</Pill>)}</div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="text-2xl font-semibold text-gray-900">{currency(l.price)}</div>
                    <Badge className="border-gray-200 text-gray-600">{l.status}</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Cost options</div>
                  <Tiers basePrice={l.price} listingId={l.id} providerId={data.provider.id} onSelect={() => setActiveListingId(String(l.id))} />
                  {!isActive && (
                    <Button variant="ghost" type="button" onClick={() => setActiveListingId(String(l.id))}>
                      Focus on this service
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
          {data.listings.length === 0 && <div className="text-sm text-gray-500">No active listings.</div>}
        </section>

        <aside className="grid gap-6">
          <div className={`tx-card space-y-4 p-5 ${showConsultCard ? 'ring-2 ring-gray-900/15' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Plan a consultation</h3>
                <p className="mt-1 text-xs text-gray-500">Share context before booking so the trader can prepare.</p>
              </div>
              <Button variant="ghost" type="button" onClick={() => setShowConsultCard(v => !v)}>
                {showConsultCard ? 'Hide' : 'Open'}
              </Button>
            </div>
            {showConsultCard && (
              <div className="space-y-4">
                {me === undefined && <div className="text-sm text-gray-500">Checking your account…</div>}
                {me === null && (
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>Sign in to send a consultation request and unlock checkout.</p>
                    <Button onClick={() => navigate(`/signin?next=${encodeURIComponent(location.pathname + location.search)}`)}>Sign in</Button>
                  </div>
                )}
                {me && (
                  <form className="space-y-3" onSubmit={sendConsultation}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preferred date</label>
                        <Input value={consultDate} onChange={setConsultDate} placeholder="2025-04-18" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preferred time</label>
                        <Input value={consultTime} onChange={setConsultTime} placeholder="15:30" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Context for the trader</label>
                      <textarea
                        value={consultNote}
                        onChange={e => setConsultNote(e.target.value)}
                        placeholder="Share goals, constraints, or any materials they should review in advance."
                        rows={4}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300/70"
                      />
                    </div>
                    {consultFeedback && <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">{consultFeedback}</div>}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="submit" disabled={consultSubmitting}>{consultSubmitting ? 'Sending…' : 'Send consultation request'}</Button>
                      {activeListing && (
                        <Button
                          variant="subtle"
                          type="button"
                          onClick={() => navigate(`/confirm/${activeListing.id}/${data.provider.id}/${activeListing.price}`)}
                        >
                          Skip to booking
                        </Button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
          <EmbeddedChat
            providerId={data.provider.id}
            providerName={data.provider.name}
            conversationId={conversationId}
            ensureConversation={ensureConversation}
            onConversation={setConversationId}
          />
        </aside>
      </div>
    </main>
  )
}

function EmbeddedChat({ providerId, providerName, ensureConversation, conversationId, onConversation }){
  const [convId, setConvId] = React.useState(conversationId || null)
  const [messages, setMessages] = React.useState([])
  const [text, setText] = React.useState('')
  const ensureConv = React.useCallback(async () => {
    if (convId) return convId
    if (typeof ensureConversation === 'function'){
      const ensured = await ensureConversation()
      if (ensured){
        setConvId(ensured)
        onConversation?.(ensured)
        return ensured
      }
      return null
    }
    try{
      const res = await fetchAuthed('/api/conversations')
      if (res.ok){
        const list = await res.json()
        const found = (list||[]).find(c => (c.title||'').includes(providerName))
        if (found){ setConvId(found.id); onConversation?.(found.id); return found.id }
      }
      const mk = await fetchAuthed('/api/conversations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'CHAT', title:`Chat with ${providerName}`, providerId }) })
      if (mk.ok){ const d = await mk.json(); setConvId(d.id); onConversation?.(d.id); return d.id }
    }catch{}
    return null
  }, [convId, ensureConversation, onConversation, providerName])

  React.useEffect(() => {
    if (conversationId && conversationId !== convId){
      setConvId(conversationId)
    }
  }, [conversationId, convId])

  const load = React.useCallback(async () => {
    const id = await ensureConv()
    if (!id) return
    try{
      const r = await fetchAuthed(`/api/conversations/${id}/messages`)
      if (r.ok) setMessages(await r.json())
    }catch{}
  }, [ensureConv])

  React.useEffect(() => {
    load()
    const iv = setInterval(load, 3000)
    return () => clearInterval(iv)
  }, [load, providerId, providerName])

  const send = async (e) => {
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
    <div className="tx-card space-y-4 p-5">
      <h3 className="text-lg font-semibold text-gray-900">Message {providerName}</h3>
      <div className="h-64 overflow-y-auto rounded-xl border border-gray-100 bg-white/70 p-3">
        {messages.map(m => (
          <div key={m.id} className="mb-3 space-y-1">
            <div className="inline-flex max-w-[80%] rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-800">{m.content}</div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{new Date(m.createdAt||Date.now()).toLocaleString()}</div>
          </div>
        ))}
        {messages.length===0 && <div className="text-sm text-gray-500">No messages yet. Say hello.</div>}
      </div>
      <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
        <Input value={text} onChange={setText} placeholder="Type a message" />
        <Button className="w-full sm:w-auto" type="submit">Send</Button>
      </form>
    </div>
  )
}
