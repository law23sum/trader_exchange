import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { currency, Pill } from '../components/ui.js'

export default function ComparePage(){
  const [players, setPlayers] = useState([])
  const [listings, setListings] = useState([])
  const [params] = useSearchParams()
  const ids = (params.get('ids')||'').split(',').map(s=>s.trim()).filter(Boolean)

  useEffect(()=>{
    (async ()=>{
      try{
        const [p,l] = await Promise.all([fetch('/api/players'), fetch('/api/listings')])
        const playersData = await p.json()
        const listingsData = await l.json()
        setPlayers(Array.isArray(playersData) ? playersData.map(pl => ({ ...pl, id: String(pl.id) })) : [])
        setListings(Array.isArray(listingsData) ? listingsData.map(it => ({ ...it, id: String(it.id||`${it.providerId}_${it.title||''}`), providerId: String(it.providerId), price: Number(it.price||0)||0 })) : [])
      }catch{}
    })()
  },[])

  const rows = useMemo(()=>{
    const selected = players.filter(p=>ids.includes(String(p.id)))
    return selected.map(p=>{
      const pid = String(p.id)
      const mine = listings.filter(l=>String(l.providerId)===pid)
      const minPrice = mine.length? Math.min(...mine.map(m=>m.price||Infinity)) : null
      return { provider:{ ...p, id: pid }, listings:mine, minPrice }
    })
  }, [players, listings, ids])

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Compare traders</h1>
      {rows.length<2 && <div className="text-sm text-gray-600">Select at least two traders on the results page to compare.</div>}
      {rows.length>=2 && (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-2">Provider</th>
                {rows.map(r => <th key={r.provider.id} className="text-left p-2">{r.provider.name}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t"><td className="p-2 text-gray-600">Rating</td>{rows.map(r=><td key={r.provider.id} className="p-2">{Number(r.provider.rating||0).toFixed(1)}</td>)}</tr>
              <tr className="border-t"><td className="p-2 text-gray-600">Jobs</td>{rows.map(r=><td key={r.provider.id} className="p-2">{r.provider.jobs||0}</td>)}</tr>
              {/* Hourly removed */}
              <tr className="border-t"><td className="p-2 text-gray-600">Starting price</td>{rows.map(r=><td key={r.provider.id} className="p-2">{r.minPrice!=null? currency(r.minPrice):'—'}</td>)}</tr>
              <tr className="border-t align-top"><td className="p-2 text-gray-600">Tags</td>{rows.map(r=> {
                const tags = (()=>{
                  const raw = r.listings[0]?.tags;
                  if (Array.isArray(raw)) return raw;
                  return String(raw||'').split(',');
                })()
                  .map(t=>t.trim())
                  .filter(Boolean)
                  .slice(0,5);
                return <td key={r.provider.id} className="p-2">{tags.map(t=> <Pill key={`${r.provider.id}_${t}`}>{t}</Pill>)}</td>;
              })}</tr>
              <tr className="border-t"><td className="p-2 text-gray-600">Actions</td>{rows.map(r=> <td key={r.provider.id} className="p-2"><Link className="underline" to={`/view/${r.provider.id}`}>View</Link></td>)}</tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
