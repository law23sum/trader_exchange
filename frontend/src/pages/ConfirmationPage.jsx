import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button, currency, Pill } from '../components/ui.js'

export default function ConfirmationPage(){
  const { listingId, providerId, price } = useParams()
  const navigate = useNavigate()
  const [provider, setProvider] = useState(null)

  useEffect(() => {
    (async () => {
      try{
        const res = await fetch(`/api/providers/${providerId}`)
        if (res.ok){ const d = await res.json(); setProvider(d.provider) }
      }catch{}
    })()
  }, [providerId])

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Confirm your selection</h1>
      <p className="text-gray-600 mb-6">Listing <code className="text-xs">{listingId}</code> from provider <code className="text-xs">{providerId}</code>. You chose the option priced at <strong>{currency(Number(price)||0)}</strong>.</p>

      <div className="border rounded-2xl p-4 mb-4">
        <div className="text-sm text-gray-700">• Delivery window: 3–5 days<br/>• Messaging enabled<br/>• Escrow protected</div>
      </div>

      {provider && (
        <div className="border rounded-2xl p-4 mb-4 bg-white">
          <div className="font-medium mb-1">Provider details</div>
          {provider.bio && <div className="text-sm text-gray-700 mb-2">{provider.bio}</div>}
          <div className="flex flex-wrap gap-3 text-sm text-gray-700">
            {provider.location && <div>📍 {provider.location}</div>}
            {provider.hourlyRate > 0 && <div>💵 ${Number(provider.hourlyRate).toFixed(0)}/hr</div>}
            {provider.availability && <div>🗓 {provider.availability}</div>}
            {provider.website && <a className="underline" href={provider.website} target="_blank" rel="noreferrer">🔗 Website</a>}
            {provider.phone && <div>📞 {provider.phone}</div>}
          </div>
          {(provider.specialties||'').split(',').map(s=>s.trim()).filter(Boolean).length>0 && (
            <div className="flex flex-wrap gap-2 mt-2">{(provider.specialties||'').split(',').map(s=>s.trim()).filter(Boolean).map(s => <Pill key={s}>{s}</Pill>)}</div>
          )}
          <div className="flex flex-wrap gap-3 text-sm text-gray-700 mt-2">
            {Number(provider.experienceYears)>0 && <div>🛠 {provider.experienceYears} yrs</div>}
            {provider.languages && <div>🌐 {provider.languages}</div>}
            {provider.certifications && <div>🎓 {provider.certifications}</div>}
            {provider.socialTwitter && <a href={provider.socialTwitter} target="_blank" rel="noreferrer" className="underline">Twitter</a>}
            {provider.socialInstagram && <a href={provider.socialInstagram} target="_blank" rel="noreferrer" className="underline">Instagram</a>}
            {provider.portfolio && <a href={provider.portfolio} target="_blank" rel="noreferrer" className="underline">Portfolio</a>}
          </div>
          {(provider.sessionLength || provider.editedPhotos || provider.delivery || provider.turnaround || provider.styles || provider.equipment) && (
            <div className="mt-3 text-sm text-gray-800">
              <div className="font-medium mb-1">Portrait session</div>
              <div className="flex flex-wrap gap-3">
                {provider.sessionLength && <div>⏱ {provider.sessionLength}</div>}
                {Number(provider.editedPhotos)>0 && <div>🖼 {provider.editedPhotos} edited photos</div>}
                {provider.delivery && <div>📦 {provider.delivery}</div>}
                {provider.turnaround && <div>⚡ {provider.turnaround} turnaround</div>}
                {provider.travelRadius && <div>🧭 {provider.travelRadius}</div>}
                {provider.onLocation ? <div>🚗 On location</div> : null}
                {provider.studioAvailable ? <div>🏢 Studio available</div> : null}
              </div>
              {(provider.styles||'').split(',').map(s=>s.trim()).filter(Boolean).length>0 && (
                <div className="flex flex-wrap gap-2 mt-2">{(provider.styles||'').split(',').map(s=>s.trim()).filter(Boolean).map(s => <Pill key={s}>{s}</Pill>)}</div>
              )}
              {provider.equipment && <div className="text-xs text-gray-600 mt-2">Equipment: {provider.equipment}</div>}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
        <Button onClick={() => navigate(`/checkout/${listingId}/${providerId}/${price}`)}>Continue to checkout</Button>
      </div>

      <div className="text-xs text-gray-500 mt-6">
        Looking for something else? <Link to="/results" className="underline">Return to results</Link>.
      </div>
    </main>
  )
}
