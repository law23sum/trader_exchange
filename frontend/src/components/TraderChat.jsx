import React from 'react'
import { fetchAuthed } from '../hooks/useAuth.js'

function Thinking() {
  return (
    <div className="pg-chat-message-system">
      <div className="pg-message-contents text-sm text-gray-600 add-loading-dots">Thinking</div>
    </div>
  )
}

function HumanMessage({ content }){
  return (
    <div className="pg-chat-message-user">
      <div className="pg-message-contents bg-black text-white inline-block px-3 py-2 rounded-2xl">{content}</div>
    </div>
  )
}

function AIMessage({ content }){
  return (
    <div className="pg-chat-message-system">
      <div className="pg-message-contents bg-gray-100 text-gray-800 inline-block px-3 py-2 rounded-2xl">{content}</div>
    </div>
  )
}

export default function TraderChat({ providerId, providerName }){
  const [convId, setConvId] = React.useState(null)
  const [messages, setMessages] = React.useState([
    { id:'welcome', role:'assistant', content:'Hello, what can I help you with today?' }
  ])
  const [text, setText] = React.useState('')
  const [pending, setPending] = React.useState(false)

  async function ensureConv(){
    if (convId) return convId
    try{
      const res = await fetchAuthed('/api/conversations')
      if (res.ok){
        const list = await res.json()
        const found = (list||[]).find(c => (c.title||'').includes(providerName))
        if (found){ setConvId(found.id); return found.id }
      }
      const mk = await fetchAuthed('/api/conversations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'CHAT', title:`Chat with ${providerName}` }) })
      if (mk.ok){ const d = await mk.json(); setConvId(d.id); return d.id }
    }catch{}
    return null
  }

  async function load(){
    const id = await ensureConv(); if (!id) return
    try{
      const r = await fetchAuthed(`/api/conversations/${id}/messages`)
      if (r.ok) setMessages(await r.json())
    }catch{}
  }

  React.useEffect(() => { load() }, [providerId, providerName])

  async function send(e){
    e?.preventDefault?.()
    const content = text.trim(); if (!content) return
    setText('')
    setPending(true)
    const id = await ensureConv(); if (!id) { setPending(false); return }
    try{
      const r = await fetchAuthed(`/api/conversations/${id}/messages`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content }) })
      if (r.ok){ await load() }
    }catch{}
    finally { setPending(false) }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100">
      <h3 className="mb-2 text-lg font-semibold">Message {providerName}</h3>
      <div className="h-64 overflow-y-auto rounded-xl border p-2 bg-white/50 dark:bg-gray-800/50 dark:border-gray-700" id="message-list">
        {messages.map(m => m.role==='user' ? <HumanMessage key={m.id} content={m.content} /> : <AIMessage key={m.id} content={m.content} />)}
        {pending && <Thinking />}
        {messages.length===0 && !pending && <div className="text-sm text-gray-500">No messages yet. Say hello.</div>}
      </div>
      <form onSubmit={send} className="mt-2 flex flex-col sm:flex-row gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" className="flex-1 rounded-xl border p-2 dark:bg-gray-900 dark:border-gray-700" />
        <button className="rounded-xl bg-black px-4 py-2 text-white w-full sm:w-auto dark:bg-white dark:text-black" type="submit">Send</button>
      </form>
    </div>
  )
}
