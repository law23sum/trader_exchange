import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JourneyStepper } from '../components/JourneyStepper.jsx'
import { Section, Button, Badge, Input } from '../components/ui.js'
import { fetchAuthed } from '../hooks/useAuth.js'

function normalizeDate(value){
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function composeDate(date, time){
  if (!date && !time) return null
  const combined = [date, time].filter(Boolean).join(' ')
  return normalizeDate(combined) || normalizeDate(date)
}

function orderPriority(order){
  const scheduled = composeDate(order?.request?.date, order?.request?.time)
  if (scheduled) return scheduled.getTime()
  const created = normalizeDate(order?.createdAt)
  return created ? created.getTime() : Number.MAX_SAFE_INTEGER
}

export default function TraderHome({ me }){
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try{
      const res = await fetchAuthed('/api/trader/orders')
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

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const prioritized = useMemo(() => {
    const term = filter.trim().toLowerCase()
    return orders
      .filter(order => String(order.status || '').toLowerCase() !== 'complete')
      .filter(order => {
        if (!term) return true
        const haystack = [order?.userName, order?.userEmail, order?.service, order?.request?.details]
          .map(text => String(text || '').toLowerCase())
        return haystack.some(text => text.includes(term))
      })
      .slice()
      .sort((a, b) => orderPriority(a) - orderPriority(b))
  }, [orders, filter])

  return (
    <main className="tx-container space-y-10 py-10">
      <section className="space-y-6">
        <JourneyStepper stage="service" />
        <div className="tx-card space-y-5 p-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">{me ? `${me.name}'s service queue` : 'Service queue'}</h1>
            <p className="text-sm text-gray-600">Review upcoming commitments in order, stay ahead of service dates, and jump straight into the right conversation.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:w-80">
              <Input value={filter} onChange={setFilter} placeholder="Filter by customer, service, or note" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={loadOrders} disabled={ordersLoading}>{ordersLoading ? 'Refreshing…' : 'Refresh queue'}</Button>
              <Button variant="ghost" onClick={() => navigate('/dashboard/trader')}>View status board</Button>
            </div>
          </div>
          <div className="grid gap-3 text-xs text-gray-500 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">Customers are sorted by the next scheduled touchpoint so priorities stay clear.</div>
            <div className="rounded-xl bg-gray-50 p-4">Open their service card to see timing, scope, and notes captured during booking.</div>
            <div className="rounded-xl bg-gray-50 p-4">Use the status board for aggregate metrics and trend tracking.</div>
          </div>
        </div>
      </section>

      <Section
        title="Priority customers"
        right={<span className="text-xs font-medium text-gray-500">{ordersLoading ? 'Loading…' : `${prioritized.length} queued`}</span>}
      >
        <div className="space-y-3">
          {ordersLoading && <div className="text-sm text-gray-500">Loading current orders…</div>}
          {!ordersLoading && prioritized.length === 0 && (
            <div className="text-sm text-gray-500">No active customers in the queue. When new orders arrive they will appear here automatically.</div>
          )}
          {prioritized.map(order => {
            const scheduled = composeDate(order?.request?.date, order?.request?.time)
            const created = normalizeDate(order?.createdAt)
            const status = String(order.status || '').toLowerCase() || 'pending'
            return (
              <div key={order.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900">{order.userName || 'Customer'}</div>
                    <div className="text-xs text-gray-500">{order.userEmail || 'No email on file'}</div>
                    <div className="text-xs text-gray-500">Service: {order.service || 'Service request'}</div>
                    {scheduled && <div className="text-xs text-gray-500">Scheduled: {scheduled.toLocaleString()}</div>}
                    {!scheduled && created && <div className="text-xs text-gray-500">Requested: {created.toLocaleString()}</div>}
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
                    onClick={() => navigate(`/messages?customer=${encodeURIComponent(order.userEmail || order.userName || '')}`)}
                    className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-100"
                  >
                    Message customer
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/trader`)}
                    className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-100"
                  >
                    Update status
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </main>
  )
}
