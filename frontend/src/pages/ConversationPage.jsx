import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Input } from '../components/ui.js'
import { fetchAuthed } from '../hooks/useAuth.js'

export default function ConversationPage(){
  const { id } = useParams()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const listRef = useRef(null)

  async function load(){
    try{ const r = await fetchAuthed(`/api/conversations/${id}/messages`); if (r.ok) setMessages(await r.json()) }catch{}
  }
  useEffect(()=>{ load() },[id])
  useEffect(()=>{ listRef.current?.scrollTo?.(0, listRef.current.scrollHeight) },[messages])

  const send = async (e) => {
    e?.preventDefault?.()
    const content = text.trim(); if (!content) return
    setText('')
    try{
      const r = await fetchAuthed(`/api/conversations/${id}/messages`, { method:'POST', body: JSON.stringify({ content }) })
      if (r.ok){ await load() }
    }catch{}
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div ref={listRef} className="border rounded-2xl p-3 h-[60vh] overflow-y-auto bg-white">
        {messages.map(m => (
          <div key={m.id} className={`my-2 ${m.role==='user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block px-3 py-2 rounded-2xl border ${m.role==='user'?'bg-black text-white border-black':'bg-gray-50 text-gray-800 border-gray-200'}`}>
              <pre className="whitespace-pre-wrap break-words text-sm">{m.content}</pre>
            </div>
          </div>
        ))}
        {messages.length===0 && <div className="text-sm text-gray-500">Say hi to start the conversation.</div>}
      </div>
      <form onSubmit={send} className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Input value={text} onChange={setText} placeholder="Type a message..." onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ send(e) } }} />
        <Button type="submit">Send</Button>
      </form>
    </main>
  )
}
