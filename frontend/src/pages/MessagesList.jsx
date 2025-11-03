import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAuthed } from '../hooks/useAuth.js'

export default function MessagesList(){
  const [items, setItems] = useState([])
  async function load(){
    try{ const r = await fetchAuthed('/api/conversations'); if (r.ok) setItems(await r.json()) }catch{}
  }
  useEffect(()=>{ load() },[])

  // New chat with a trader is initiated from the provider page; disabled here.

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Messages</h1>
      </div>
      <div className="space-y-2">
        {items.map(c => (
          <Link key={c.id} to={`/messages/${c.id}`} className="block border rounded-2xl p-3 hover:bg-gray-50 bg-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-50 border grid place-items-center text-xs font-semibold">💬</div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.title || 'Conversation'}</div>
                <div className="text-xs text-gray-500 truncate">{c.lastMessage || 'No messages yet'}</div>
              </div>
            </div>
          </Link>
        ))}
        {items.length===0 && <div className="text-sm text-gray-500">No messages yet.</div>}
      </div>
    </main>
  )
}

