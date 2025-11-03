import React, { useEffect, useMemo, useState } from 'react'
import { fetchAuthed } from '../hooks/useAuth.js'
import { Section, Button, Pill, Badge } from '../components/ui.js'

function groupBy(arr, key){
  const map = new Map()
  for (const item of arr){
    const value = typeof key === 'function' ? key(item) : item?.[key]
    const normalized = String(value || 'unknown').toLowerCase()
    map.set(normalized, (map.get(normalized) || 0) + 1)
  }
  return map
}

function titleCase(value){
  if (!value) return 'Unknown'
  const text = String(value).replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function AdminDashboard(){
  const [users, setUsers] = useState([])
  const [providers, setProviders] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try{
      const [uRes, pRes, lRes] = await Promise.all([
        fetchAuthed('/api/admin/users'),
        fetchAuthed('/api/players'),
        fetchAuthed('/api/listings')
      ])
      const usersJson = uRes.ok ? await uRes.json() : []
      const providersJson = pRes.ok ? await pRes.json() : []
      const listingsJson = lRes.ok ? await lRes.json() : []
      setUsers(Array.isArray(usersJson) ? usersJson : [])
      const providerList = Array.isArray(providersJson) ? providersJson : []
      setProviders(providerList.filter(p => String(p.role || '').toUpperCase() === 'PROVIDER'))
      setListings(Array.isArray(listingsJson) ? listingsJson : [])
    }catch{
      setUsers([])
      setProviders([])
      setListings([])
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalUsers = users.length
  const totalProviders = providers.length
  const totalListings = listings.length

  const roleBreakdown = useMemo(() => {
    const map = groupBy(users, user => user?.role || 'USER')
    return Array.from(map.entries()).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count)
  }, [users])

  const listingsByStatus = useMemo(() => {
    const map = groupBy(listings, listing => listing?.status || 'draft')
    return Array.from(map.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count)
  }, [listings])

  const providersByListings = useMemo(() => {
    const map = new Map()
    for (const listing of listings){
      const pid = listing?.providerId
      if (!pid) continue
      map.set(pid, (map.get(pid) || 0) + 1)
    }
    return providers
      .map(provider => ({
        id: provider.id,
        name: provider.name,
        location: provider.location,
        listings: map.get(provider.id) || 0,
        rating: provider.rating || 0,
      }))
      .sort((a, b) => b.listings - a.listings || b.rating - a.rating)
      .slice(0, 6)
  }, [providers, listings])

  const recentListings = useMemo(() => {
    return listings
      .map(item => ({
        ...item,
        createdAt: item?.createdAt || item?.updatedAt || item?.publishedAt,
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6)
  }, [listings])

  const providerLocations = useMemo(() => {
    const map = groupBy(providers, provider => provider?.location || 'Unspecified')
    return Array.from(map.entries()).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count)
  }, [providers])

  return (
    <main className="tx-container space-y-8 py-10">
      <section className="space-y-4">
        <div className="tx-card flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">Admin status board</h1>
            <p className="text-sm text-gray-600">Review marketplace health metrics and surface operational insights.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh metrics'}</Button>
            <Button variant="ghost" onClick={() => window.open('/', '_blank')}>View home</Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Registered users</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{totalUsers}</div>
            <p className="mt-2 text-xs">All customer, trader, and admin accounts tracked in the system.</p>
          </div>
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active providers</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{totalProviders}</div>
            <p className="mt-2 text-xs">Providers currently available to accept or manage services.</p>
          </div>
          <div className="tx-card p-5 text-sm text-gray-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Listings live</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{totalListings}</div>
            <p className="mt-2 text-xs">Published marketplace offerings across all categories.</p>
          </div>
        </div>
      </section>

      <Section
        title="Role distribution"
        right={<span className="text-xs text-gray-500">{roleBreakdown.reduce((acc, item) => acc + item.count, 0)} accounts</span>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {roleBreakdown.map(item => (
            <div key={item.role} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">{titleCase(item.role)}</div>
                <Badge className="border-gray-200 text-gray-700">{item.count}</Badge>
              </div>
              <p className="mt-2 text-xs text-gray-500">Share of users with the {titleCase(item.role).toLowerCase()} role.</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-gray-900" style={{ width: `${totalUsers ? Math.max(8, (item.count / totalUsers) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
          {roleBreakdown.length === 0 && <div className="text-sm text-gray-500">No roles detected. Refresh metrics to load marketplace data.</div>}
        </div>
      </Section>

      <Section
        title="Listings overview"
        right={<span className="text-xs text-gray-500">{totalListings} total</span>}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            {listingsByStatus.map(item => (
              <div key={item.status} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{titleCase(item.status)}</div>
                  <p className="text-xs text-gray-500">Listings currently tagged as {titleCase(item.status).toLowerCase()}.</p>
                </div>
                <Badge className="border-gray-200 text-gray-700">{item.count}</Badge>
              </div>
            ))}
            {listingsByStatus.length === 0 && <div className="text-sm text-gray-500">No listings available—encourage traders to publish services.</div>}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Latest listings</div>
            <div className="mt-2 space-y-2 text-xs text-gray-500">
              {recentListings.map(listing => (
                <div key={listing.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-sm font-semibold text-gray-900">{listing.title || 'Untitled listing'}</div>
                  <div className="mt-1">Status: {titleCase(listing.status)}</div>
                  {listing.createdAt && <div>{new Date(listing.createdAt).toLocaleString()}</div>}
                  {listing.tags && listing.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {listing.tags.slice(0, 6).map(tag => <Pill key={`${listing.id}-${tag}`}>{tag}</Pill>)}
                    </div>
                  )}
                </div>
              ))}
              {recentListings.length === 0 && <div>No recent listings to highlight.</div>}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Provider spotlight"
        right={<span className="text-xs text-gray-500">{totalProviders} providers</span>}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Top providers by listings</div>
            <div className="mt-2 space-y-2 text-xs text-gray-500">
              {providersByListings.map(provider => (
                <div key={provider.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{provider.name}</div>
                    <div>{provider.location || 'No location'}</div>
                  </div>
                  <div className="text-right">
                    <div>{provider.listings} listing(s)</div>
                    <div>⭐ {provider.rating ? Number(provider.rating).toFixed(1) : '0.0'}</div>
                  </div>
                </div>
              ))}
              {providersByListings.length === 0 && <div>No provider activity recorded.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Provider locations</div>
            <div className="mt-2 space-y-2 text-xs text-gray-500">
              {providerLocations.slice(0, 6).map(item => (
                <div key={item.location} className="flex items-center justify-between">
                  <span>{titleCase(item.location)}</span>
                  <span>{item.count}</span>
                </div>
              ))}
              {providerLocations.length === 0 && <div>No location data captured.</div>}
            </div>
          </div>
        </div>
      </Section>
    </main>
  )
}
