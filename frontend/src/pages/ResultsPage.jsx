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
  const [searchProviders, setSearchProviders] = useState([]);
  const [searchListings, setSearchListings] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFetched, setSearchFetched] = useState(false);

  useEffect(() => {
    (async () => {
      try{
        const [p,l] = await Promise.all([fetch('/api/players'), fetch('/api/listings')]);
        const playersJson = await p.json();
        setPlayers(Array.isArray(playersJson) ? playersJson : []);
        const raw = await l.json();
        const mapped = Array.isArray(raw) ? raw : [];
        setListings(mapped.map(x => ({...x, tags: typeof x.tags === 'string' ? x.tags.split(',').map(t=>t.trim()).filter(Boolean) : Array.isArray(x.tags) ? x.tags : [] })));
      }catch{}
    })();
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!q){
      setSearchProviders([]);
      setSearchListings([]);
      setSearchFetched(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    setSearchFetched(false);
    (async () => {
      try{
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (ignore) return;
        if (res.ok){
          const data = await res.json();
          const prov = Array.isArray(data?.providers) ? data.providers : [];
          const list = Array.isArray(data?.listings) ? data.listings : [];
          setSearchProviders(prov);
          setSearchListings(list.map(x => ({...x, tags: typeof x.tags === 'string' ? x.tags.split(',').map(t=>t.trim()).filter(Boolean) : Array.isArray(x.tags) ? x.tags : [] })));
        } else {
          setSearchProviders([]);
          setSearchListings([]);
        }
      }catch{
        if (!ignore){
          setSearchProviders([]);
          setSearchListings([]);
        }
      }finally{
        if (!ignore){
          setSearchLoading(false);
          setSearchFetched(true);
        }
      }
    })();
    return () => { ignore = true; };
  }, [q]);

  const recs = useMemo(() => {
    const sourceProviders = q ? searchProviders : players;
    const sourceListings = q ? searchListings : listings;
    const providers = (sourceProviders || []).filter(p => String(p.role || '').toUpperCase() === 'PROVIDER');
    const unique = [];
    const seen = new Set();
    for (const p of providers){
      const key = String(p.id || '');
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(p);
    }
    return unique.map(p => ({
      provider: p,
      listings: sourceListings.filter(l => String(l.providerId) === String(p.id)),
      score: scoreProviderForQuery(p, sourceListings, q)
    })).sort((a,b)=>b.score-a.score);
  }, [players, listings, searchProviders, searchListings, q]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-5">
        <form onSubmit={(e)=>{ e.preventDefault(); navigate(`/results?q=${encodeURIComponent(searchQ)}`) }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-xl">
          <input className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/20" value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search services or categories" />
          <button className="px-4 py-3 rounded-2xl bg-black text-white border border-black w-full sm:w-auto">Search</button>
        </form>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{q ? `Results for “${q}”` : 'Recommended traders'}</h2>
        <div className="text-sm text-gray-500">{recs.length} {recs.length === 1 ? 'match' : 'matches'}</div>
      </div>
      {q && searchLoading && (
        <div className="text-sm text-gray-500 mb-3">Searching providers…</div>
      )}
      {q && !searchLoading && searchFetched && recs.length === 0 && (
        <div className="text-sm text-gray-500 mb-3">No traders matched your search. Try a different keyword or browse categories.</div>
      )}
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
            {item.provider.bio && (
              <div className="text-sm text-gray-600">{item.provider.bio}</div>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {item.provider.hourlyRate > 0 && <span>💵 ${Number(item.provider.hourlyRate).toFixed(0)}/hr</span>}
              {Number(item.provider.experienceYears)>0 && <span>🛠 {Number(item.provider.experienceYears)} yrs experience</span>}
              {item.provider.availability && <span>🗓 {item.provider.availability}</span>}
            </div>
            {(() => {
              const raw = item.provider.specialties;
              const arr = Array.isArray(raw) ? raw : String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
              if (arr.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-2">
                  {arr.slice(0, 4).map(s => <Pill key={s}>{s}</Pill>)}
                </div>
              );
            })()}
            {(() => {
              const featured = item.listings.find(l => q && String(l.title || '').toLowerCase().includes(q.toLowerCase())) || item.listings[0];
              if (!featured) return <div className="text-sm text-gray-500">No active listings yet.</div>;
              const tags = Array.isArray(featured.tags) ? featured.tags : String(featured.tags || '').split(',').map(t => t.trim()).filter(Boolean);
              return (
                <div className="text-sm text-gray-700">
                  <div className="font-medium">Sample: {featured.title}</div>
                  <div className="text-gray-600">Starting at {currency(featured.price || 0)}</div>
                  <div className="flex flex-wrap gap-2 mt-2">{tags.map(t => <Pill key={t}>{t}</Pill>)}</div>
                </div>
              );
            })()}
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
