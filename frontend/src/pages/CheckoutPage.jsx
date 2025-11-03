import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Button, currency, Input, Pill } from '../components/ui.js'
import { JourneyStepper } from '../components/JourneyStepper.jsx'
import { getCustomerProfile, setCustomerProfile } from '../utils/customerProfile.js'

export default function CheckoutPage(){
  const { listingId, providerId, price } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [tasks, setTasks] = useState('')
  const [provider, setProvider] = useState(null)
  const [listing, setListing] = useState(null)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [error, setError] = useState('')

  const amount = Number(price) || Number(listing?.price || 0)
  const customerKey = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search])
  const customerDetailsHref = useMemo(() => `/customer-details?next=${encodeURIComponent(customerKey)}`, [customerKey])

  useEffect(() => {
    (async () => {
      try{
        const res = await fetch(`/api/providers/${providerId}`)
        if (res.ok){
          const d = await res.json()
          setProvider(d.provider)
          if (Array.isArray(d.listings)){
            const match = d.listings.find(item => String(item.id) === String(listingId))
            setListing(match || d.listings[0] || null)
          }
        }
      }catch{}
    })()
  }, [providerId, listingId])

  useEffect(() => {
    const saved = getCustomerProfile()
    const required = ['name', 'email', 'phone', 'address']
    const missing = !saved || required.some(field => !String(saved?.[field] || '').trim())
    if (missing) {
      navigate(customerDetailsHref, { replace: true })
      return
    }
    setName(saved.name || '')
    setEmail(saved.email || '')
    setPhone(saved.phone || '')
    setAddress(saved.address || '')
    setTasks(saved.tasks || '')
    setDate(saved.date || '')
    setTime(saved.time || '')
  }, [navigate, customerDetailsHref])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim() || !date.trim()){
      alert('Please fill name, email, phone, address, and preferred date')
      return
    }

    try{
      const snapshot = { ...(getCustomerProfile() || {}), name, email, phone, address, date, time, tasks }
      setCustomerProfile(snapshot)
      setLoadingCheckout(true)

      const token = localStorage.getItem('tx_token') || ''
      const successUrl = `${window.location.origin}/payment/success?listingId=${encodeURIComponent(listingId||'')}&providerId=${encodeURIComponent(providerId||'')}&price=${encodeURIComponent(String(amount||0))}`
      const cancelUrl = `${window.location.origin}/checkout/${listingId||''}/${providerId||''}/${amount||0}`
      const payload = {
        amount,
        currency: 'usd',
        successUrl,
        cancelUrl,
        metadata: { name, email, phone, address, date, time, listingId, providerId }
      }

      const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 10000)
      const res = await fetch('/api/stripe/create-checkout-session', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...(token? { Authorization:`Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      }).finally(()=>clearTimeout(t))
      const data = await res.json().catch(()=>null)
      if (res.ok){
        const publishableKey = import.meta.env.VITE_STRIPE_PK || ''
        try{
          if (!publishableKey){
            throw new Error('Stripe publishable key missing')
          }
          const stripe = await loadStripe(publishableKey)
          if (!stripe){
            throw new Error('Unable to initialise Stripe.js')
          }
          if (data?.id){
            const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: data.id })
            if (stripeError){
              throw new Error(stripeError.message || 'Stripe checkout failed to start')
            }
            return
          }
        }catch(stripeErr){
          console.warn('Stripe redirect fallback', stripeErr)
          if (data?.url){
            window.location.href = data.url
            return
          }
          setError(stripeErr?.message || 'Unable to start Stripe checkout. Please try again.')
          return
        }
        if (data?.url){
          window.location.href = data.url
          return
        }
        setError('Stripe returned an unexpected response. Please refresh and try again.')
        return
      }
      setError((data && (data.error || data.details || data.message)) || `Failed to start Stripe checkout (HTTP ${res.status})`)
    }catch(err){
      setError('Could not reach the payment gateway. Please check your connection and try again.')
    }finally{
      setLoadingCheckout(false)
    }
  }

  return (
    <main className="tx-container space-y-8 py-10">
      <JourneyStepper stage="book" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">Secure checkout</h1>
            <p className="text-sm text-gray-600">Lock in your service date, share on-site details, and review everything before paying on Stripe.</p>
          </div>
          <div className="tx-card space-y-5 p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Service total</div>
              <div className="text-2xl font-semibold text-gray-900">{currency(amount)}</div>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>We preload your saved contact info from Customer details.</span>
                <Button variant="ghost" type="button" onClick={() => navigate(customerDetailsHref)}>Edit details</Button>
              </div>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Full name</label>
                  <Input value={name} onChange={setName} placeholder="Ada Lovelace" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</label>
                  <Input value={email} onChange={setEmail} placeholder="ada@example.com" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preferred service date</label>
                  <Input type="date" value={date} onChange={setDate} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preferred time</label>
                  <Input type="time" value={time} onChange={setTime} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contact phone</label>
                  <Input value={phone} onChange={setPhone} placeholder="(555) 123-4567" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Service address</label>
                  <Input value={address} onChange={setAddress} placeholder="123 Main St, City, ST" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tasks / specifics</label>
                <textarea
                  value={tasks}
                  onChange={e => setTasks(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300/70"
                  placeholder="Describe requested tasks, site access details, and any special instructions."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes to trader (optional)</label>
                <Input value={note} onChange={setNote} placeholder="Share anything else to prep for the visit" />
              </div>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button variant="ghost" onClick={() => navigate(-1)} type="button">Back</Button>
                <Button type="submit" disabled={loadingCheckout}>{loadingCheckout ? 'Redirecting…' : 'Continue to Stripe'}</Button>
              </div>
              <div className="text-xs text-gray-500">Stripe opens in a new tab. Once payment succeeds, you will return here automatically.</div>
            </form>
          </div>
        </section>

        <aside className="space-y-6">
          {provider && (
            <div className="tx-card space-y-4 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Provider overview</div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-gray-900">{provider.name}</div>
                {listing && <div className="text-sm text-gray-600">Service: {listing.title}</div>}
              </div>
              {provider.bio && <p className="text-sm text-gray-600">{provider.bio}</p>}
              <div className="flex flex-wrap gap-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                {provider.location && <span>📍 {provider.location}</span>}
                {provider.availability && <span>🗓 {provider.availability}</span>}
                {provider.phone && <span>📞 {provider.phone}</span>}
              </div>
              {(provider.specialties||'').split(',').map(s=>s.trim()).filter(Boolean).length>0 && (
                <div className="flex flex-wrap gap-2">{(provider.specialties||'').split(',').map(s=>s.trim()).filter(Boolean).map(s => <Pill key={s}>{s}</Pill>)}</div>
              )}
            </div>
          )}
          <div className="tx-card space-y-3 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">After payment</div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• The trader receives your address, tasks, and schedule instantly.</li>
              <li>• Use Messages to adjust timing or request a consultation follow-up.</li>
              <li>• Mark the service complete and leave a review once the job is done.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}
