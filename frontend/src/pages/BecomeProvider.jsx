import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function BecomeProvider(){
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [agree, setAgree] = useState(false)

  const start = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('role','TRADER')
    if (name) params.set('name', name)
    if (email) params.set('email', email)
    navigate(`/signup?${params.toString()}`)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-3">Become a provider</h1>
      <p className="text-gray-700">Offer your services on Trade Exchange. Create a trader profile, add listings, and start taking orders.</p>

      <form className="mt-6 space-y-3" onSubmit={start}>
        <div>
          <label className="text-xs text-gray-500">Your name</label>
          <input className="w-full px-3 py-2 rounded-xl border border-gray-300" value={name} onChange={e=>setName(e.target.value)} placeholder="Taylor Provider" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Email</label>
          <input className="w-full px-3 py-2 rounded-xl border border-gray-300" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} /> I agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy</Link>.
        </label>
        <button disabled={!agree} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${agree? 'bg-black text-white border-black':'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'}`}>
          Create my trader account
        </button>
      </form>

      <div className="text-sm text-gray-600 mt-6">
        New to the platform? <Link to="/how-it-works" className="underline">See how it works</Link> or review <Link to="/pricing" className="underline">pricing</Link>.
      </div>
    </main>
  )
}

