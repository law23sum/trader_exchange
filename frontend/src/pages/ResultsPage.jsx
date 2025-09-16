import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Badge, Pill, Button, PlayerBadge, currency } from '../components/ui.js'

function scoreProviderForQuery(provider, listings, query){
  const q = (query||'').toLowerCase().trim();
  const mine = listings.filter(l => l.providerId === provider.id);
  if (!q) return 0.1 + provider.rating/10 + provider.jobs/1000;
  let s = 0;
  for(const l of mine){
    const hay = `${l.title} ${l.description} ${l.tags}`.toLowerCase();
    const hits = hay.split(q).length - 1;
    s += hits*2;
    const mid = 120;
    s += Math.max(0, Math.min(1, 1 - Math.abs(l.price-mid)/300));
  }
  s += provider.rating * 1.5 + Math.log10(provider.jobs + 1);
  return s;
}

export default function ResultsPage(){
  const [players, setPlayers] = useState([]);
  const [listings, setListings] = useState([]);
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState(q);

  useEffect(() => {
    (async () => {
      try{
        const [p,l] = await Promise.all([fetch('/api/players'), fetch('/api/listings')]);
        setPlayers(await p.json());
        const raw = await l.json();
        setListings(raw.map(x => ({...x, tags:(x.tags||'').split(',').filter(Boolean)})));
      }catch{}
    })();
  }, []);

  const recs = useMemo(() => {
    const providers = players.filter(p => p.role === 'PROVIDER');
    return providers.map(p => ({
      provider: p,
      listings: listings.filter(l => l.providerId === p.id),
      score: scoreProviderForQuery(p, listings, q)
    })).sort((a,b)=>b.score-a.score);
  }, [players, listings, q]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-5">
        <form onSubmit={(e)=>{ e.preventDefault(); navigate(`/results?q=${encodeURIComponent(searchQ)}`) }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-xl">
          <input className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/20" value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search services or categories" />
          <button className="px-4 py-3 rounded-2xl bg-black text-white border border-black w-full sm:w-auto">Search</button>
        </form>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Recommended traders for “{q || '(blank)'}”</h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recs.map(item => (
          <div key={item.provider.id} className="border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <PlayerBadge player={item.provider} />
              <div className="text-right">
                {item.provider.location && <div className="text-xs text-gray-500">{item.provider.location}</div>}
                <Badge className="border-gray-300 text-gray-700">Match {Math.round(item.score)}</Badge>
              </div>
            </div>
            {item.listings[0] && (
              <div className="text-sm text-gray-700">
                <div className="font-medium">Sample: {item.listings[0].title}</div>
                <div className="text-gray-600">Starting at {currency(item.listings[0].price)}</div>
                <div className="flex flex-wrap gap-2 mt-2">{item.listings[0].tags.map(t => <Pill key={t}>{t}</Pill>)}</div>
              </div>
            )}
            {item.provider.hourlyRate > 0 && (
              <div className="text-xs text-gray-600">Hourly from ${Number(item.provider.hourlyRate).toFixed(0)}</div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">{item.listings.length} offering(s)</div>
              <Button onClick={() => navigate(`/provider/${item.provider.id}?selected=${encodeURIComponent(item.listings?.[0]?.id||'')}`)}>View details</Button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
