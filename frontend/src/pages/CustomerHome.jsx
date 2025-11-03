import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JourneyStepper } from '../components/JourneyStepper.jsx'
import { Section, Button, Badge, Input } from '../components/ui.js'
import { fetchAuthed } from '../hooks/useAuth.js'
import { ensureConversationWithProvider } from '../hooks/useConversations.js'

const STATUS_PRIORITY = ['approved', 'discuss', 'pending', 'in_progress']

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

function statusPriority(status){
  const idx = STATUS_PRIORITY.indexOf(String(status || '').toLowerCase())
  return idx === -1 ? STATUS_PRIORITY.length : idx
}

export default function CustomerHome({ me }){
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyQuery, setHistoryQuery] = useState('')
  const [messagingOrderId, setMessagingOrderId] = useState(null)

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try{
      const res = await fetchAuthed('/api/orders/mine')
      if (res.ok){
        const data = await res.json()
        if (Array.isArray(data)) setOrders(data)
        else setOrders([])
      } else {
        setOrders([])
      }
    }catch{
      setOrders([])
    }finally{
      setOrdersLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try{
      const res = await fetchAuthed('/api/user/history')
      if (res.ok){
        const data = await res.json()
        if (Array.isArray(data)) setHistory(data)
        else setHistory([])
      } else {
        setHistory([])
      }
    }catch{
      setHistory([])
    }finally{
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
    loadHistory()
  }, [loadOrders, loadHistory])

  const activeOrders = useMemo(() => {
    return orders
      .filter(order => String(order.status || '').toLowerCase() !== 'complete')
      .slice()
      .sort((a, b) => {
        const statusDiff = statusPriority(a.status) - statusPriority(b.status)
        if (statusDiff !== 0) return statusDiff
        return orderSortKey(a) - orderSortKey(b)
      })
  }, [orders])

  const historyItems = useMemo(() => {
    const term = historyQuery.trim().toLowerCase()
    return history
      .slice()
      .sort((a, b) => {
        const da = normalizeDate(a?.at) || new Date(0)
        const db = normalizeDate(b?.at) || new Date(0)
        return db.getTime() - da.getTime()
      })
      .filter(item => {
        if (!term) return true
        const haystack = [item?.providerName, item?.note, item?.status].map(text => String(text || '').toLowerCase())
        return haystack.some(text => text.includes(term))
      })
  }, [history, historyQuery])

  const handleSearch = useCallback((event) => {
    event?.preventDefault?.()
    const q = search.trim()
    if (!q){
      navigate('/results')
      return
    }
    navigate(`/results?q=${encodeURIComponent(q)}`)
  }, [navigate, search])

  const handleMessage = useCallback(async (order) => {
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
    }finally{
      setMessagingOrderId(null)
    }
  }, [navigate])

  return (
    <main className="tx-container space-y-10 py-10">
      <section className="space-y-6">
        <JourneyStepper stage="discover" />
        <div className="tx-card space-y-5 p-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">{me ? `Welcome back, ${me.name}` : 'Welcome back'}</h1>
            <p className="text-sm text-gray-600">Search for a trader, jump into an active service, or reference your service history in one place.</p>
          </div>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={search}
              onChange={setSearch}
              placeholder="Search services, traders, or categories"
              onKeyDown={event => { if (event.key === 'Enter') handleSearch(event) }}
            />
            <Button type="submit" className="sm:w-auto w-full">Search traders</Button>
          </form>
          <div className="grid gap-3 text-xs text-gray-500 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">Discover vetted traders faster with curated categories and live availability.</div>
            <div className="rounded-xl bg-gray-50 p-4">Track ongoing services without leaving the page—status and notes stay updated.</div>
            <div className="rounded-xl bg-gray-50 p-4">Browse prior services to repeat successful engagements or share feedback.</div>
          </div>
        </div>
      </section>

      <Section
        title="Active services"
        right={<span className="text-xs font-medium text-gray-500">{ordersLoading ? 'Loading…' : `${activeOrders.length} active`}</span>}
      >
        <div className="space-y-3">
          {ordersLoading && <div className="text-sm text-gray-500">Gathering your latest bookings…</div>}
          {!ordersLoading && activeOrders.length === 0 && (
            <div className="text-sm text-gray-500">No active services right now. Start a new search above to book your next session.</div>
          )}
          {activeOrders.map(order => {
            const key = `${order.id}`
            const created = normalizeDate(order?.createdAt)
            const scheduled = order?.request?.date ? [order.request.date, order.request.time].filter(Boolean).join(' · ') : null
            const status = String(order.status || '').toLowerCase() || 'pending'
            return (
              <div key={key} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900">{order.service || 'Service request'}</div>
                    <div className="text-xs text-gray-500">Order #{order.id}{created ? ` · ${created.toLocaleString()}` : ''}</div>
                    {order.providerName && <div className="text-xs text-gray-500">Trader: {order.providerName}</div>}
                    {scheduled && <div className="text-xs text-gray-500">Scheduled: {scheduled}</div>}
                  </div>
                  <Badge className={status === 'approved' ? 'border-emerald-200 text-emerald-600' : status === 'discuss' ? 'border-amber-200 text-amber-600' : 'border-gray-200 text-gray-600'}>
                    {status}
                  </Badge>
                </div>
                {order.request?.details && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">{order.request.details}</pre>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={() => handleMessage(order)}
                    disabled={messagingOrderId === order.id}
                    className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {messagingOrderId === order.id ? 'Opening chat…' : 'Message trader'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/provider/${order.providerId}`)}
                    className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-100"
                  >
                    View listing
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        title="Service history"
        right={
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Search history</span>
            <div className="w-48"><Input value={historyQuery} onChange={setHistoryQuery} placeholder="Trader or note" /></div>
          </div>
        }
      >
        <div className="space-y-3">
          {historyLoading && <div className="text-sm text-gray-500">Loading your past interactions…</div>}
          {!historyLoading && historyItems.length === 0 && (
            <div className="text-sm text-gray-500">No history found with that search. Clear the search to review all completed services.</div>
          )}
          {historyItems.map(item => {
            const occurred = normalizeDate(item?.at)
            return (
              <div key={item.id || `${item.providerName}-${item.at}`} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.providerName || 'Trader'}</div>
                    {item.note && <div className="text-xs text-gray-500">{item.note}</div>}
                  </div>
                  <div className="text-xs text-gray-500">{occurred ? occurred.toLocaleString() : '—'}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </main>
  )
}
