import React from 'react'

export default function HomeSearch({ onSearch, q, setQ }){
  return (
    <main className="max-w-6xl mx-auto px-4">
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="text-4xl font-semibold">Find what you need.</div>
        <div className="text-gray-600 mt-3">Sign in to browse categories, favorite traders, and check out securely.</div>

        <form onSubmit={onSearch} className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-xl mx-auto">
          <input className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/20" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search services or categories" />
          <button className="px-4 py-3 rounded-2xl bg-black text-white border border-black w-full sm:w-auto">Search</button>
        </form>
      </div>
    </main>
  )
}
