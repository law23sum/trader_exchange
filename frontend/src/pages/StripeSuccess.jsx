import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getCustomerProfile } from '../utils/customerProfile.js'

export default function StripeSuccess(){
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState('finalizing')

  useEffect(() => {
    (async () => {
      try{
        const qs = new URLSearchParams(location.search)
        const listingId = qs.get('listingId')||''
        const providerId = qs.get('providerId')||''
        const price = Number(qs.get('price')||'0')
        const token = localStorage.getItem('tx_token') || ''
        const cust = getCustomerProfile() || {}
        const body = {
          amount: price,
          name: cust.name||'',
          email: cust.email||'',
          note: '',
          listingId,
          providerId,
          date: cust.date||'',
          time: cust.time||'',
          address: cust.address||'',
          phone: cust.phone||'',
          tasks: ''
        }
        const res = await fetch('/api/checkout', {
          method:'POST',
          headers:{'Content-Type':'application/json', ...(token? { Authorization:`Bearer ${token}` } : {})},
          body: JSON.stringify(body)
        })
        if (res.ok){ setStatus('done'); navigate(`/dashboard/user`) }
        else { setStatus('error') }
      }catch{ setStatus('error') }
    })()
  }, [location.search, navigate])

  return (
    <main className="tx-container py-10">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Processing your order…</h1>
        <p className="text-gray-600">Please wait a moment while we finalize your booking.</p>
        {status==='error' && <div className="mt-4 text-sm text-red-600">We couldn’t finalize the order. Please contact support.</div>}
      </div>
    </main>
  )
}

