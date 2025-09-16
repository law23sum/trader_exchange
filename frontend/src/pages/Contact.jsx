import React, { useState } from 'react'

export default function Contact(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    // Demo only — no backend route required; show a success state.
    setSent(true)
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-3">Contact us</h1>
      {!sent ? (
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="text-xs text-gray-500">Full name</label>
            <input className="w-full px-3 py-2 rounded-xl border border-gray-300" value={name} onChange={e=>setName(e.target.value)} placeholder="Taylor Doe" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Email</label>
            <input className="w-full px-3 py-2 rounded-xl border border-gray-300" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Message</label>
            <textarea rows={5} className="w-full px-3 py-2 rounded-xl border border-gray-300" value={message} onChange={e=>setMessage(e.target.value)} placeholder="How can we help?" />
          </div>
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border bg-black text-white border-black">Send</button>
        </form>
      ) : (
        <div className="rounded-2xl border p-4 bg-green-50 text-green-800">Thanks! We received your message and will reply soon.</div>
      )}
    </main>
  )
}

