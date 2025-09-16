import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui.js'
import { fetchAuthed } from '../hooks/useAuth.js'

export default function MessagesList(){
  const [items, setItems] = useState([])
  const navigate = useNavigate()
  async function load(){
    try{ const r = await fetchAuthed('/api/conversations'); if (r.ok) setItems(await r.json()) }catch{}
  }
  useEffect(()=>{ load() },[])

  const newChat = async () => {
    try{ const r = await fetchAuthed('/api/conversations', { method:'POST', body: JSON.stringify({ kind:'AI', title:'AI Chat' }) }); if (r.ok){ const d=await r.json(); navigate(`/messages/${d.id}`) } }catch{}
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <Button onClick={newChat}>New AI Chat</Button>
      </div>
      <div className="space-y-2">
        {items.map(c => (
          <Link key={c.id} to={`/messages/${c.id}`} className="block border rounded-2xl p-3 hover:bg-gray-50">
            <div className="text-sm font-medium">{c.title || (c.kind==='AI'?'AI Chat':'Conversation')}</div>
            <div className="text-xs text-gray-500 truncate">{c.lastMessage || 'No messages yet'}</div>
          </Link>
        ))}
        {items.length===0 && <div className="text-sm text-gray-500">No messages yet.</div>}
      </div>
    </main>
  )
}

