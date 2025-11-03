import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Badge, Pill, Button, PlayerBadge, Input, currency } from '../components/ui.js'
import { JourneyStepper } from '../components/JourneyStepper.jsx'

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
    <main className="tx-container py-10 space-y-8">
      <JourneyStepper stage="discover" />
      <div className="mx-auto max-w-3xl">
        <form
          onSubmit={(e)=>{ e.preventDefault(); navigate(`/results?q=${encodeURIComponent(searchQ)}`) }}
          className="flex flex-col items-stretch gap-3 sm:flex-row"
        >
          <Input value={searchQ} onChange={setSearchQ} placeholder="Search services or categories" />
          <Button className="w-full sm:w-auto" type="submit">Search</Button>
        </form>
      </div>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>{q ? `Results for “${q}”` : 'Recommended traders'}</h2>
          <div className="text-sm font-medium text-gray-500">{recs.length} {recs.length === 1 ? 'match' : 'matches'}</div>
        </div>
        {q && searchLoading && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-4 py-3 text-sm text-gray-600">Searching providers…</div>
        )}
        {q && !searchLoading && searchFetched && recs.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-4 py-3 text-sm text-gray-600">
            No traders matched your search. Try a different keyword or browse categories.
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {recs.map(item => (
            <article key={item.provider.id} className="tx-card flex h-full flex-col gap-5 p-5">
              <div className="flex items-start justify-between gap-4">
                <PlayerBadge player={item.provider} />
                <div className="text-right">
                  {item.provider.location && <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.provider.location}</div>}
                  <Badge className="mt-1 border-gray-200 text-gray-600">Match {Math.round(item.score)}</Badge>
                </div>
              </div>
              {item.provider.bio && (
                <p className="text-sm text-gray-600">{item.provider.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500">
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
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="font-semibold text-gray-900">{featured.title}</div>
                    <div className="text-sm text-gray-500">Starting at {currency(featured.price || 0)}</div>
                    <div className="flex flex-wrap gap-2">{tags.map(t => <Pill key={t}>{t}</Pill>)}</div>
                  </div>
                );
              })()}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.listings.length} offering(s)</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="subtle" onClick={() => navigate(`/provider/${item.provider.id}?selected=${encodeURIComponent(item.listings?.[0]?.id||'')}&consult=1`)}>Schedule consult</Button>
                  <Button onClick={() => navigate(`/provider/${item.provider.id}?selected=${encodeURIComponent(item.listings?.[0]?.id||'')}`)}>View details</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
