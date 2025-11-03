import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAuthed } from '../hooks/useAuth.js'
import { ensureConversationWithProvider } from '../hooks/useConversations.js'
import { Section, Button, Badge } from '../components/ui.js'
import { JourneyStepper } from '../components/JourneyStepper.jsx'
import { getCustomerProfile, CUSTOMER_PROFILES_KEY, LEGACY_CUSTOMER_KEY } from '../utils/customerProfile.js'

const STATUS_ORDER = ['approved', 'discuss', 'pending', 'in_progress', 'complete', 'cancelled']

function normalizeDate(value){
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function orderSortKey(order){
  const date = order?.request?.date
  const time = order?.request?.time
  if (date){
    const composed = [date, time].filter(Boolean).join(' ')
    const parsed = normalizeDate(composed) || normalizeDate(date)
    if (parsed) return parsed.getTime()
  }
  const created = normalizeDate(order?.createdAt)
  return created ? created.getTime() : Number.MAX_SAFE_INTEGER
}

function formatStatus(status){
  const value = String(status || 'pending').replace(/_/g, ' ')
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function UserDashboard(){
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [customerProfile, setCustomerProfile] = useState(null)
  const [messagingOrderId, setMessagingOrderId] = useState(null)

  const refreshCustomerProfile = useCallback(() => {
    const saved = getCustomerProfile(me)
    if (saved && typeof saved === 'object') setCustomerProfile(saved)
    else setCustomerProfile(null)
  }, [me])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try{
      const res = await fetchAuthed('/api/orders/mine')
      if (res.ok){
        const data = await res.json()
        setOrders(Array.isArray(data) ? data : [])
      } else {
        setOrders([])
      }
    }catch{
      setOrders([])
    }finally{
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCustomerProfile()
    if (typeof window === 'undefined') return
    const handler = (event) => {
      if (!event || event.key === null || event.key === CUSTOMER_PROFILES_KEY || event.key === LEGACY_CUSTOMER_KEY){
        refreshCustomerProfile()
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [refreshCustomerProfile])

  useEffect(() => {
    (async () => {
      try{
        const m = await fetchAuthed('/api/me'); if (m.ok) setMe(await m.json())
        const f = await fetchAuthed('/api/user/favorites'); if (f.ok) setFavorites(await f.json())
        const h = await fetchAuthed('/api/user/history'); if (h.ok) setHistory(await h.json())
        const c = await fetch('/api/categories'); if (c.ok) setCategories(await c.json())
        await loadOrders()
      }catch{}
    })()
  }, [loadOrders])

  const completedOrders = useMemo(() => orders.filter(o => String(o.status || '').toLowerCase() === 'complete').length, [orders])
  const activeOrders = useMemo(() => orders.filter(o => String(o.status || '').toLowerCase() !== 'complete').length, [orders])

  const pipeline = useMemo(() => {
    const counts = new Map()
    for (const order of orders){
      const status = String(order.status || 'pending').toLowerCase()
      counts.set(status, (counts.get(status) || 0) + 1)
    }
    const known = STATUS_ORDER.filter(status => counts.has(status))
    const extras = Array.from(counts.keys()).filter(status => !STATUS_ORDER.includes(status)).sort()
    return [...known, ...extras].map(status => ({ status, count: counts.get(status) }))
  }, [orders])

  const upcomingOrder = useMemo(() => {
    const active = orders.filter(order => String(order.status || '').toLowerCase() !== 'complete')
    if (active.length === 0) return null
    return active.slice().sort((a, b) => orderSortKey(a) - orderSortKey(b))[0]
  }, [orders])

  const handleMessageTrader = useCallback(async (order) => {
    if (!order?.providerId){
      navigate('/messages')
      return
    }
    setMessagingOrderId(order.id)
    try{
      const conversationId = await ensureConversationWithProvider(order.providerId, order.providerName)
      if (conversationId){
        navigate(`/messages/${conversationId}`)
      } else {
        navigate('/messages')
      }
    } finally {
      setMessagingOrderId(null)
    }
  }, [navigate])

  const lastInteraction = useMemo(() => {
    const sorted = history
      .map(item => ({ ...item, atDate: normalizeDate(item?.at) || new Date(0) }))
      .sort((a, b) => b.atDate.getTime() - a.atDate.getTime())
    return sorted[0] || null
  }, [history])

  const interactionProviders = useMemo(() => {
    const counts = new Map()
    for (const item of history){
      const key = item?.providerName || 'Unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }, [history])

  const favoritesSpotlight = useMemo(() => {
    return favorites
      .map(entry => ({ name: entry?.provider?.name || 'Trader', count: entry?.count || 0, id: entry?.provider?.id }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [favorites])

  const customerFields = ['name', 'email', 'phone', 'address', 'date', 'time']
  const completedFields = customerFields.filter(field => customerProfile && customerProfile[field])
  const profileScore = Math.round((completedFields.length / customerFields.length) * 100)

  const categoryHighlights = useMemo(() => {
    return (Array.isArray(categories) ? categories : []).slice(0, 6)
  }, [categories])

  return (
    <main className="tx-container space-y-8 py-10">
      <JourneyStepper stage="review" />

      <section className="space-y-4">
        <div className="tx-card flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">{me ? `${me.name}'s status board` : 'Status board'}</h1>
            <p className="text-sm text-gray-600">Monitor service momentum, check engagement health, and confirm your profile readiness.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={loadOrders} disabled={ordersLoading}>{ordersLoading ? 'Refreshing…' : 'Refresh pipeline'}</Button>
            <Button variant="ghost" onClick={() => navigate('/')}>Go to home</Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active bookings</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{activeOrders}</div>
            <p className="mt-2 text-xs">Keep an eye on open services that still need attention or coordination.</p>
          </div>
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Completed services</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{completedOrders}</div>
            <p className="mt-2 text-xs">Review history to repeat past hits or share feedback with your traders.</p>
          </div>
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Favorites saved</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{favorites.length}</div>
            <p className="mt-2 text-xs">Favorites surface here so you can rebook trusted partners quickly.</p>
          </div>
        </div>
      </section>

      <Section
        title="Service pipeline"
        right={<span className="text-xs font-medium text-gray-500">{orders.length} total orders</span>}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {pipeline.length === 0 && <div className="text-sm text-gray-500">No orders yet—start on the home page to book your first trader.</div>}
          {pipeline.map(entry => (
            <div key={entry.status} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{formatStatus(entry.status)}</div>
                  <p className="text-xs text-gray-500">Orders currently marked as {formatStatus(entry.status).toLowerCase()}.</p>
                </div>
                <Badge className="border-gray-200 text-gray-700">{entry.count}</Badge>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-gray-900" style={{ width: `${orders.length ? Math.max(8, (entry.count / orders.length) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Upcoming focus"
        right={upcomingOrder ? <span className="text-xs text-gray-500">Order #{upcomingOrder.id}</span> : null}
      >
        {upcomingOrder ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-900">{upcomingOrder.service || 'Service request'}</div>
                {upcomingOrder.providerName && <div className="text-xs text-gray-500">Trader: {upcomingOrder.providerName}</div>}
                {upcomingOrder.request?.date && (
                  <div className="text-xs text-gray-500">Scheduled: {[upcomingOrder.request.date, upcomingOrder.request.time].filter(Boolean).join(' · ')}</div>
                )}
              </div>
              <Badge className="border-gray-200 text-gray-600">{formatStatus(upcomingOrder.status)}</Badge>
            </div>
            {upcomingOrder.request?.details && (
              <pre className="whitespace-pre-wrap rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">{upcomingOrder.request.details}</pre>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <button
                type="button"
                onClick={() => handleMessageTrader(upcomingOrder)}
                disabled={messagingOrderId === upcomingOrder.id}
                className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {messagingOrderId === upcomingOrder.id ? 'Opening chat…' : 'Message trader'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-100"
              >
                View in home
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No upcoming services right now. Head to the home page to activate a new booking.</div>
        )}
      </Section>

      <Section
        title="Engagement stats"
        right={<span className="text-xs text-gray-500">{history.length} recorded interactions</span>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Most recent interaction</div>
            {lastInteraction ? (
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <div>{lastInteraction.providerName || 'Trader'}</div>
                <div>{lastInteraction.note || 'No notes captured.'}</div>
                <div>{normalizeDate(lastInteraction.at)?.toLocaleString() || '—'}</div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-500">No interactions recorded yet.</div>
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Providers engaged</div>
            <div className="mt-2 space-y-2">
              {interactionProviders.slice(0, 4).map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs text-gray-500">
                  <span>{item.name}</span>
                  <span>{item.total}</span>
                </div>
              ))}
              {interactionProviders.length === 0 && <div className="text-xs text-gray-500">No providers contacted yet.</div>}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Favorites spotlight"
        right={<span className="text-xs text-gray-500">Top picks</span>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {favoritesSpotlight.map(entry => (
            <div key={entry.id || entry.name} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">{entry.name}</div>
              <div className="text-xs text-gray-500">{entry.count} interactions saved</div>
            </div>
          ))}
          {favoritesSpotlight.length === 0 && <div className="text-sm text-gray-500">No favorites yet—mark traders from the home page to keep them close.</div>}
        </div>
      </Section>

      <Section
        title="Profile readiness"
        right={<span className="text-xs text-gray-500">{completedFields.length}/{customerFields.length} fields</span>}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Checkout information completeness</div>
            <p className="text-xs text-gray-500">{profileScore}% complete — keeping details current speeds up every booking.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative size-16">
              <svg viewBox="0 0 36 36" className="size-16">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                  d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31z"
                />
                <path
                  className="text-gray-900"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                  d="M18 2.5a15.5 15.5 0 0 1 0 31"
                  strokeDasharray={`${Math.max(5, Math.min(97, profileScore))} 100`}
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-gray-900">{profileScore}%</div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/customer-details')}>Update profile</Button>
          </div>
        </div>
        {categoryHighlights.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="font-semibold uppercase tracking-wide text-gray-400">Suggested categories:</span>
            {categoryHighlights.map(category => (
              <span key={category} className="rounded-full border border-gray-200 px-3 py-1">{category}</span>
            ))}
          </div>
        )}
      </Section>
    </main>
  )
}
