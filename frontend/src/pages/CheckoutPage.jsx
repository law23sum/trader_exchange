import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, currency, Input, Pill } from '../components/ui.js'

export default function CheckoutPage(){
  const { listingId, providerId, price } = useParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [card, setCard] = useState('')
  const [note, setNote] = useState('')
  const [provider, setProvider] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      try{
        const res = await fetch(`/api/providers/${providerId}`)
        if (res.ok){ const d = await res.json(); setProvider(d.provider) }
      }catch{}
    })()
  }, [providerId])

  const submit = async (e) => {
    e.preventDefault()
    try{
      const token = localStorage.getItem('tx_token') || ''
      const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 8000)
      const res = await fetch('/api/checkout', {
        method:'POST',
        headers:{'Content-Type':'application/json', ...(token? { Authorization:`Bearer ${token}` } : {})},
        body: JSON.stringify({ amount: Number(price)||0, name, email, note, listingId, providerId }),
        signal: ctrl.signal
      }).finally(()=>clearTimeout(t))
      let data
      try{ data = await res.json() }catch{ try{ data = { message: await res.clone().text() } }catch{ data = null } }
      if (res.ok){
        alert(`Payment authorized: ${data.txId}`)
        navigate('/dashboard/user')
      } else {
        alert((data && (data.error || data.message)) || `Checkout failed (HTTP ${res.status})`)
      }
    }catch{}
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Checkout</h1>
      <p className="text-gray-600 mb-6">Total: <strong>{currency(Number(price)||0)}</strong></p>
      {provider && (
        <div className="border rounded-2xl p-4 mb-6 bg-white">
          <div className="font-medium mb-1">Provider details</div>
          {provider.bio && <div className="text-sm text-gray-700 mb-2">{provider.bio}</div>}
          <div className="flex flex-wrap gap-3 text-sm text-gray-700">
            {provider.location && <div>📍 {provider.location}</div>}
            {provider.hourlyRate > 0 && <div>💵 ${Number(provider.hourlyRate).toFixed(0)}/hr</div>}
            {provider.availability && <div>🗓 {provider.availability}</div>}
            {provider.website && <a className="underline" href={provider.website} target="_blank" rel="noreferrer">🔗 Website</a>}
            {provider.phone && <div>📞 {provider.phone}</div>}
          </div>
          {(provider.specialties||'').split(',').map(s=>s.trim()).filter(Boolean).length>0 && (
            <div className="flex flex-wrap gap-2 mt-2">{(provider.specialties||'').split(',').map(s=>s.trim()).filter(Boolean).map(s => <Pill key={s}>{s}</Pill>)}</div>
          )}
          {(provider.sessionLength || provider.editedPhotos || provider.delivery || provider.turnaround || provider.styles || provider.equipment) && (
            <div className="mt-3 text-sm text-gray-800">
              <div className="font-medium mb-1">Portrait session</div>
              <div className="flex flex-wrap gap-3">
                {provider.sessionLength && <div>⏱ {provider.sessionLength}</div>}
                {Number(provider.editedPhotos)>0 && <div>🖼 {provider.editedPhotos} edited photos</div>}
                {provider.delivery && <div>📦 {provider.delivery}</div>}
                {provider.turnaround && <div>⚡ {provider.turnaround} turnaround</div>}
                {provider.travelRadius && <div>🧭 {provider.travelRadius}</div>}
                {provider.onLocation ? <div>🚗 On location</div> : null}
                {provider.studioAvailable ? <div>🏢 Studio available</div> : null}
              </div>
              {(provider.styles||'').split(',').map(s=>s.trim()).filter(Boolean).length>0 && (
                <div className="flex flex-wrap gap-2 mt-2">{(provider.styles||'').split(',').map(s=>s.trim()).filter(Boolean).map(s => <Pill key={s}>{s}</Pill>)}</div>
              )}
              {provider.equipment && <div className="text-xs text-gray-600 mt-2">Equipment: {provider.equipment}</div>}
            </div>
          )}
        </div>
      )}
      <form className="space-y-3" onSubmit={submit}>
        <div><label className="text-xs text-gray-500">Full name</label><Input value={name} onChange={setName} placeholder="Ada Lovelace" /></div>
        <div><label className="text-xs text-gray-500">Email</label><Input value={email} onChange={setEmail} placeholder="ada@example.com" /></div>
        <div><label className="text-xs text-gray-500">Card</label><Input value={card} onChange={setCard} placeholder="4242 4242 4242 4242" /></div>
        <div><label className="text-xs text-gray-500">Note (optional)</label><Input value={note} onChange={v=>setNote(v)} placeholder="Any specifics?" /></div>
        <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={() => navigate(-1)} type="button">Back</Button><Button type="submit">Pay & place order</Button></div>
      </form>
      <div className="text-xs text-gray-500 mt-6">You must be signed in to record purchases to your history.</div>
    </main>
  )
}
