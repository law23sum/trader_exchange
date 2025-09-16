import React, { useEffect, useState } from 'react'
import { fetchAuthed } from '../hooks/useAuth.js'
import { Section, Button, Input } from '../components/ui.js'
import { currency } from '../components/ui.js'

export default function TraderDashboard(){
  const [me, setMe] = useState(null)
  const [summary, setSummary] = useState({ earnings:0, orders:0 })
  const [history, setHistory] = useState([])
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [availability, setAvailability] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [languages, setLanguages] = useState('')
  const [certifications, setCertifications] = useState('')
  const [socialTwitter, setSocialTwitter] = useState('')
  const [socialInstagram, setSocialInstagram] = useState('')
  const [portfolio, setPortfolio] = useState('')
  // Portrait Session specifics
  const [sessionLength, setSessionLength] = useState('60 min')
  const [editedPhotos, setEditedPhotos] = useState('10')
  const [delivery, setDelivery] = useState('Online gallery')
  const [turnaround, setTurnaround] = useState('3–5 days')
  const [onLocation, setOnLocation] = useState(true)
  const [studioAvailable, setStudioAvailable] = useState(false)
  const [travelRadius, setTravelRadius] = useState('15 miles')
  const [stylesDetail, setStylesDetail] = useState('natural light, candid, editorial')
  const [equipment, setEquipment] = useState('Full-frame body, 50mm, 85mm, reflector')

  useEffect(() => {
    (async () => {
      try{
        const m = await fetchAuthed('/api/me'); if (m.ok){ const u = await m.json(); setMe(u) }
        const s = await fetchAuthed('/api/trader/summary'); if (s.ok) setSummary(await s.json())
        const h = await fetchAuthed('/api/trader/history'); if (h.ok) setHistory(await h.json())
        const pr = await fetchAuthed('/api/trader/profile'); if (pr.ok){ const p = await pr.json(); setBio(p.bio||''); setLocation(p.location||''); setWebsite(p.website||''); setPhone(p.phone||''); setSpecialties(p.specialties||''); setHourlyRate(p.hourlyRate||''); setAvailability(p.availability||''); setExperienceYears(p.experienceYears||''); setLanguages(p.languages||''); setCertifications(p.certifications||''); setSocialTwitter(p.socialTwitter||''); setSocialInstagram(p.socialInstagram||''); setPortfolio(p.portfolio||''); setSessionLength(p.sessionLength||'60 min'); setEditedPhotos(String(p.editedPhotos||'10')); setDelivery(p.delivery||'Online gallery'); setTurnaround(p.turnaround||'3–5 days'); setOnLocation(Boolean(p.onLocation ?? true)); setStudioAvailable(Boolean(p.studioAvailable ?? false)); setTravelRadius(p.travelRadius||'15 miles'); setStylesDetail(p.styles||'natural light, candid, editorial'); setEquipment(p.equipment||'Full-frame body, 50mm, 85mm, reflector') }
      }catch{}
    })()
  }, [])

  const saveProfile = async () => {
    try{
      const r = await fetchAuthed('/api/trader/profile', { method:'POST', body: JSON.stringify({ bio, location, website, phone, specialties, hourlyRate: Number(hourlyRate||0), availability, experienceYears: Number(experienceYears||0), languages, certifications, socialTwitter, socialInstagram, portfolio, sessionLength, editedPhotos: Number(editedPhotos||0), delivery, turnaround, onLocation, studioAvailable, travelRadius, styles: stylesDetail, equipment }) })
      if (r.ok) alert('Profile saved'); else alert('Failed to save')
    }catch{}
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Trader dashboard{me ? ` — ${me.name}` : ''}</h1>

      <Section title="Earnings">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border rounded-2xl p-4"><div className="text-sm text-gray-500">Total earnings</div><div className="text-2xl font-semibold">{currency(summary.earnings || 0)}</div></div>
          <div className="border rounded-2xl p-4"><div className="text-sm text-gray-500">Total orders</div><div className="text-2xl font-semibold">{summary.orders || 0}</div></div>
        </div>
      </Section>

      <Section title="Your profile">
        <div className="space-y-2">
          <div><label className="text-xs text-gray-500">Bio</label><textarea rows={4} className="w-full px-3 py-2 rounded-xl border border-gray-300" value={bio} onChange={e=>setBio(e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Location</label><Input value={location} onChange={setLocation} placeholder="City, Country" /></div>
            <div><label className="text-xs text-gray-500">Website</label><Input value={website} onChange={setWebsite} placeholder="https://example.com" /></div>
            <div><label className="text-xs text-gray-500">Phone</label><Input value={phone} onChange={setPhone} placeholder="+1 555-123-4567" /></div>
            <div><label className="text-xs text-gray-500">Specialties (comma separated)</label><Input value={specialties} onChange={setSpecialties} placeholder="portrait, weddings, events" /></div>
            <div><label className="text-xs text-gray-500">Hourly rate (USD)</label><Input value={hourlyRate} onChange={setHourlyRate} placeholder="75" /></div>
            <div><label className="text-xs text-gray-500">Availability</label><Input value={availability} onChange={setAvailability} placeholder="Weekdays 9–5" /></div>
            <div><label className="text-xs text-gray-500">Years of experience</label><Input value={experienceYears} onChange={setExperienceYears} placeholder="5" /></div>
            <div><label className="text-xs text-gray-500">Languages</label><Input value={languages} onChange={setLanguages} placeholder="English, Spanish" /></div>
            <div className="sm:col-span-2"><label className="text-xs text-gray-500">Certifications</label><Input value={certifications} onChange={setCertifications} placeholder="Certified Pro, Safety Cert" /></div>
            <div><label className="text-xs text-gray-500">Twitter</label><Input value={socialTwitter} onChange={setSocialTwitter} placeholder="https://twitter.com/handle" /></div>
            <div><label className="text-xs text-gray-500">Instagram</label><Input value={socialInstagram} onChange={setSocialInstagram} placeholder="https://instagram.com/handle" /></div>
            <div className="sm:col-span-2"><label className="text-xs text-gray-500">Portfolio</label><Input value={portfolio} onChange={setPortfolio} placeholder="https://portfolio.example.com" /></div>
          </div>
          <Button onClick={saveProfile}>Save</Button>
        </div>
      </Section>

      <Section title="Portrait session details">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500">Session length</label><Input value={sessionLength} onChange={setSessionLength} placeholder="60 min" /></div>
          <div><label className="text-xs text-gray-500">Edited photos included</label><Input value={editedPhotos} onChange={setEditedPhotos} placeholder="10" /></div>
          <div><label className="text-xs text-gray-500">Delivery method</label><Input value={delivery} onChange={setDelivery} placeholder="Online gallery" /></div>
          <div><label className="text-xs text-gray-500">Turnaround time</label><Input value={turnaround} onChange={setTurnaround} placeholder="3–5 days" /></div>
          <div><label className="text-xs text-gray-500">Travel radius</label><Input value={travelRadius} onChange={setTravelRadius} placeholder="15 miles" /></div>
          <div><label className="text-xs text-gray-500">Styles (comma separated)</label><Input value={stylesDetail} onChange={setStylesDetail} placeholder="natural light, candid, editorial" /></div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500">Equipment</label><Input value={equipment} onChange={setEquipment} placeholder="Full-frame body, 50mm, 85mm, reflector" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={onLocation} onChange={e=>setOnLocation(e.target.checked)} /> On location</label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={studioAvailable} onChange={e=>setStudioAvailable(e.target.checked)} /> Studio available</label>
        </div>
        <div className="mt-3"><Button onClick={saveProfile}>Save</Button></div>
      </Section>

      <Section title="Recent interactions">
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="border rounded-2xl p-3 flex items-center justify-between">
              <div className="text-sm"><span className="font-medium">{h.userName}</span> — {h.note}</div>
              <div className="text-xs text-gray-500">{new Date(h.at).toLocaleString()} · {currency(h.amount||0)}</div>
            </div>
          ))}
          {history.length === 0 && <div className="text-sm text-gray-500">No interactions yet.</div>}
        </div>
      </Section>
    </main>
  )
}
