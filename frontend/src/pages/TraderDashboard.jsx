import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAuthed } from '../hooks/useAuth.js'
import { Section, Button, Badge, currency } from '../components/ui.js'
import { JourneyStepper } from '../components/JourneyStepper.jsx'

const STATUS_ORDER = ['approved', 'in_progress', 'discuss', 'pending', 'complete', 'cancelled']

function normalizeDate(value){
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function formatStatus(status){
  const value = String(status || 'pending').replace(/_/g, ' ')
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function orderSortKey(order){
  const scheduled = order?.request?.date ? [order.request.date, order.request.time].filter(Boolean).join(' ') : null
  const parsed = scheduled ? normalizeDate(scheduled) : normalizeDate(order?.createdAt)
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER
}

export default function TraderDashboard(){
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [summary, setSummary] = useState({ earnings:0, orders:0 })
  const [history, setHistory] = useState([])
  const [orders, setOrders] = useState([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [messagingOrderId, setMessagingOrderId] = useState(null)

  const refreshSummary = useCallback(async () => {
    setLoadingSummary(true)
    try{
      const res = await fetchAuthed('/api/trader/summary')
      if (res.ok) setSummary(await res.json())
      else setSummary(prev => ({ ...prev }))
    }catch{}
    finally { setLoadingSummary(false) }
  }, [])

  const refreshHistory = useCallback(async () => {
    setLoadingHistory(true)
    try{
      const res = await fetchAuthed('/api/trader/history')
      if (res.ok) setHistory(await res.json())
      else setHistory([])
    }catch{
      setHistory([])
    }
    finally { setLoadingHistory(false) }
  }, [])

  const refreshOrders = useCallback(async () => {
    setLoadingOrders(true)
    try{
      const res = await fetchAuthed('/api/trader/orders')
      if (res.ok) setOrders(await res.json())
      else setOrders([])
    }catch{
      setOrders([])
    }
    finally { setLoadingOrders(false) }
  }, [])

  useEffect(() => {
    (async () => {
      try{
        const meRes = await fetchAuthed('/api/me')
        if (meRes.ok) setMe(await meRes.json())
      }catch{}
      await Promise.all([refreshSummary(), refreshOrders(), refreshHistory()])
    })()
  }, [refreshSummary, refreshOrders, refreshHistory])

  const openOrders = useMemo(() => orders.filter(order => String(order.status || '').toLowerCase() !== 'complete'), [orders])
  const completedOrders = useMemo(() => orders.filter(order => String(order.status || '').toLowerCase() === 'complete').length, [orders])

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

  const nextCommitment = useMemo(() => {
    if (openOrders.length === 0) return null
    return openOrders.slice().sort((a, b) => orderSortKey(a) - orderSortKey(b))[0]
  }, [openOrders])

  const handleMessageCustomer = useCallback((order) => {
    if (!order) return
    setMessagingOrderId(order.id)
    try{
      if (order.conversationId){
        navigate(`/messages/${order.conversationId}`)
      } else {
        navigate('/messages')
      }
    } finally {
      setMessagingOrderId(null)
    }
  }, [navigate])

  const acknowledgementRate = useMemo(() => {
    if (orders.length === 0) return 0
    const acknowledged = orders.filter(order => order?.request?.ack).length
    return Math.round((acknowledged / orders.length) * 100)
  }, [orders])

  const topCustomers = useMemo(() => {
    const counts = new Map()
    for (const order of orders){
      const key = order?.userName || 'Customer'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [orders])

  const recentInteractions = useMemo(() => {
    return history
      .map(item => ({ ...item, atDate: normalizeDate(item?.at) || new Date(0) }))
      .sort((a, b) => b.atDate.getTime() - a.atDate.getTime())
      .slice(0, 5)
  }, [history])

  const revenuePerOrder = useMemo(() => {
    const totalOrders = orders.length || summary.orders
    if (!totalOrders) return 0
    return (summary.earnings || 0) / totalOrders
  }, [orders.length, summary.earnings, summary.orders])

  return (
    <main className="tx-container space-y-8 py-10">
      <JourneyStepper stage="service" />

      <section className="space-y-4">
        <div className="tx-card flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">{me ? `${me.name}'s status board` : 'Trader status board'}</h1>
            <p className="text-sm text-gray-600">Gauge your workload, revenue, and customer engagement at a glance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={refreshOrders} disabled={loadingOrders}>{loadingOrders ? 'Refreshing orders…' : 'Refresh orders'}</Button>
            <Button variant="ghost" onClick={refreshSummary} disabled={loadingSummary}>{loadingSummary ? 'Refreshing metrics…' : 'Refresh metrics'}</Button>
            <Button variant="ghost" onClick={() => navigate('/')}>Go to home</Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total earnings</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{currency(summary.earnings || 0)}</div>
            <p className="mt-2 text-xs">Revenue captured through completed bookings and checkout sessions.</p>
          </div>
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Open orders</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{openOrders.length}</div>
            <p className="mt-2 text-xs">Work in flight—prioritize high value customers or upcoming dates.</p>
          </div>
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Interactions logged</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{history.length}</div>
            <p className="mt-2 text-xs">Track conversations, handoffs, and completion notes.</p>
          </div>
        </div>
      </section>

      <Section
        title="Service pipeline"
        right={<span className="text-xs text-gray-500">{orders.length} total orders</span>}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {pipeline.length === 0 && <div className="text-sm text-gray-500">No orders in the system yet—bookings from the home queue will populate this view.</div>}
          {pipeline.map(entry => (
            <div key={entry.status} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{formatStatus(entry.status)}</div>
                  <p className="text-xs text-gray-500">Orders currently tagged as {formatStatus(entry.status).toLowerCase()}.</p>
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
        title="Next commitments"
        right={nextCommitment ? <span className="text-xs text-gray-500">Order #{nextCommitment.id}</span> : null}
      >
        {nextCommitment ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-900">{nextCommitment.userName || 'Customer'}</div>
                <div className="text-xs text-gray-500">{nextCommitment.userEmail || 'No email on file'}</div>
                <div className="text-xs text-gray-500">Service: {nextCommitment.service || 'Service request'}</div>
                {nextCommitment.request?.date && (
                  <div className="text-xs text-gray-500">Scheduled: {[nextCommitment.request.date, nextCommitment.request.time].filter(Boolean).join(' · ')}</div>
                )}
              </div>
              <Badge className="border-gray-200 text-gray-600">{formatStatus(nextCommitment.status)}</Badge>
            </div>
            {nextCommitment.request?.details && (
              <pre className="whitespace-pre-wrap rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">{nextCommitment.request.details}</pre>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <button
                type="button"
                onClick={() => handleMessageCustomer(nextCommitment)}
                disabled={messagingOrderId === nextCommitment.id}
                className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {messagingOrderId === nextCommitment.id ? 'Opening chat…' : 'Message customer'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-100"
              >
                View in home queue
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No upcoming commitments detected. Stay tuned to the home page queue for new arrivals.</div>
        )}
      </Section>

      <Section
        title="Customer insights"
        right={<span className="text-xs text-gray-500">Ack rate {acknowledgementRate}%</span>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Top customers by requests</div>
            <div className="mt-2 space-y-2">
              {topCustomers.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs text-gray-500">
                  <span>{item.name}</span>
                  <span>{item.total}</span>
                </div>
              ))}
              {topCustomers.length === 0 && <div className="text-xs text-gray-500">No customer activity yet.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Average revenue per order</div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{currency(revenuePerOrder || 0)}</p>
            <p className="text-xs text-gray-500">Calculated from total earnings divided by orders logged.</p>
            <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
              Completed orders recorded: {completedOrders}. Increase completion volume to raise average revenue.</div>
          </div>
        </div>
      </Section>

      <Section
        title="Recent interactions"
        right={<span className="text-xs text-gray-500">{loadingHistory ? 'Loading…' : `${history.length} logged`}</span>}
      >
        <div className="space-y-2">
          {loadingHistory && <div className="text-sm text-gray-500">Fetching interaction history…</div>}
          {!loadingHistory && recentInteractions.length === 0 && <div className="text-sm text-gray-500">No interactions recorded yet.</div>}
          {recentInteractions.map(item => (
            <div key={item.id || `${item.userName}-${item.at}`} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">{item.userName || 'Customer'}</div>
                <div className="text-xs text-gray-500">{normalizeDate(item.at)?.toLocaleString() || '—'} · {currency(item.amount || 0)}</div>
              </div>
              <div className="mt-1 text-xs text-gray-500">{item.note || 'No note provided.'}</div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  )
}
