import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Input } from '../components/ui.js'
import { getCustomerProfile, setCustomerProfile } from '../utils/customerProfile.js'

export default function CustomerDetails(){
  const navigate = useNavigate()
  const location = useLocation()
  const nextUrl = useMemo(() => new URLSearchParams(location.search).get('next'), [location.search])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    const saved = getCustomerProfile()
    if (saved){
      setName(saved.name || '')
      setEmail(saved.email || '')
      setPhone(saved.phone || '')
      setAddress(saved.address || '')
      setDate(saved.date || '')
      setTime(saved.time || '')
    }
  }, [])

  const onSave = (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()){
      alert('Please fill name, email, phone, and address')
      return
    }
    const payload = { name, email, phone, address, date, time }
    setCustomerProfile(payload)
    if (nextUrl) navigate(nextUrl)
    else navigate(-1)
  }

  return (
    <main className="tx-container py-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-1">Customer details</h1>
        <p className="text-gray-600 mb-6">Save your contact and on-site details once. We’ll prefill checkout for you.</p>
        <form className="tx-card p-6 space-y-4" onSubmit={onSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Full name</label>
              <Input value={name} onChange={setName} placeholder="Ada Lovelace" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</label>
              <Input type="email" value={email} onChange={setEmail} placeholder="ada@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</label>
              <Input value={phone} onChange={setPhone} placeholder="(555) 123-4567" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Service address</label>
              <Input value={address} onChange={setAddress} placeholder="123 Main St, City, ST" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preferred date</label>
              <Input type="date" value={date} onChange={setDate} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preferred time</label>
              <Input type="time" value={time} onChange={setTime} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => (nextUrl ? navigate(nextUrl) : navigate(-1))}>Cancel</Button>
            <Button type="submit">Save details</Button>
          </div>
          <div className="text-xs text-gray-500">You can edit these anytime before checkout.</div>
        </form>
      </div>
    </main>
  )
}
