import React, { useEffect, useState } from 'react'
import { Section, Button, Input } from '../components/ui.js'
import { fetchAuthed } from '../hooks/useAuth.js'
import { useNavigate } from 'react-router-dom'

export default function EditTraderDetails(){
  const navigate = useNavigate()
  const [providerId, setProviderId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [availability, setAvailability] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  // hourlyRate removed
  const [bio, setBio] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [languages, setLanguages] = useState('')
  const [certifications, setCertifications] = useState('')
  const [socialTwitter, setSocialTwitter] = useState('')
  const [socialInstagram, setSocialInstagram] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [tagline, setTagline] = useState('')
  // Session/Offering details visible on Trader Details
  const [sessionLength, setSessionLength] = useState('')
  const [editedPhotos, setEditedPhotos] = useState('')
  const [delivery, setDelivery] = useState('')
  const [turnaround, setTurnaround] = useState('')
  const [onLocation, setOnLocation] = useState(false)
  const [studioAvailable, setStudioAvailable] = useState(false)
  const [travelRadius, setTravelRadius] = useState('')
  const [styles, setStyles] = useState('')
  const [equipment, setEquipment] = useState('')

  const [listings, setListings] = useState([])
  const [editId, setEditId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [details, setDetails] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState('LISTED')
  const [tags, setTags] = useState('')

  useEffect(()=>{
    (async()=>{
      try{ const pr = await fetchAuthed('/api/trader/profile'); if (pr.ok){ const p = await pr.json();
        if (p?.id) setProviderId(String(p.id))
        setFirstName(p.firstName||''); setLastName(p.lastName||'');
        setAvailability(p.availability||''); setPhone(p.phone||''); setWebsite(p.website||''); setLocation(p.location||'');
        setBio(p.bio||''); setExperienceYears(String(p.experienceYears||'')); setLanguages(p.languages||''); setCertifications(p.certifications||''); setSocialTwitter(p.socialTwitter||''); setSocialInstagram(p.socialInstagram||''); setPortfolio(p.portfolio||'');
        setTagline(p.tagline||'');
        setSessionLength(p.sessionLength||''); setEditedPhotos(String(p.editedPhotos||'')); setDelivery(p.delivery||''); setTurnaround(p.turnaround||''); setOnLocation(Boolean(p.onLocation||false)); setStudioAvailable(Boolean(p.studioAvailable||false)); setTravelRadius(p.travelRadius||''); setStyles(p.styles||''); setEquipment(p.equipment||'');
      } }catch{}
      // Load any saved draft for this provider so fields remain as entered
      try{
        const draft = JSON.parse(localStorage.getItem(`tx_listing_draft_${providerId}`)||'null')
        if (draft){
          setEditId(draft.editId||'');
          setTitle(draft.title||'');
          setDescription(draft.description||'');
          setDetails(draft.details||'');
          setPrice(String(draft.price ?? ''));
          setStatus(draft.status||'LISTED');
          setTags(draft.tags||'');
        }
      }catch{}
      try{
        const l = await fetchAuthed(`/api/trader/listings?providerId=${encodeURIComponent(String(providerId||''))}`);
        if (l.ok){
          const arr = await l.json();
          setListings(arr)
          // If we have an existing listing and no edit target, select the first one for updates
          if (!editId && Array.isArray(arr) && arr.length>0){
            const first = arr[0]
            setEditId(first.id||'')
            // Prefill only if fields are empty to avoid stomping user input
            if (!title) setTitle(first.title||'')
            if (!description) setDescription(first.description||'')
            if (!details) setDetails(first.details||'')
            if (!price) setPrice(String(first.price||''))
            if (!status) setStatus(first.status||'LISTED')
            if (!tags) setTags((first.tags||'').toString())
          }
        }
      }catch{}
    })()
  },[providerId])

  // Auto-fill a helpful Details template for Services offered when empty
  useEffect(() => {
    if ((details||'').trim().length>0) return
    const parts = []
    if (description) parts.push(description)
    if (sessionLength) parts.push(`Session length: ${sessionLength}`)
    if (delivery) parts.push(`Delivery: ${delivery}`)
    if (turnaround) parts.push(`Turnaround: ${turnaround}`)
    if (availability) parts.push(`Availability: ${availability}`)
    if (location) parts.push(`Location: ${location}`)
    const suggestion = parts.join('\n')
    if (suggestion.trim().length>0) setDetails(suggestion)
  }, [description, sessionLength, delivery, turnaround, availability, location])

  // Persist draft on change
  useEffect(()=>{
    try{ localStorage.setItem(`tx_listing_draft_${providerId}`, JSON.stringify({ editId, title, description, details, price, status, tags })) }catch{}
  }, [providerId, editId, title, description, details, price, status, tags])

  async function saveProfileOnly(){
    const body = { providerId, firstName, lastName, availability, phone, website, location, bio, experienceYears: Number(experienceYears||0), languages, certifications, socialTwitter, socialInstagram, portfolio, tagline, sessionLength, editedPhotos: Number(editedPhotos||0), delivery, turnaround, onLocation, studioAvailable, travelRadius, styles, equipment }
    let r = await fetchAuthed('/api/trader/profile', { method:'POST', body: JSON.stringify(body) })
    if (!r.ok){ r = await fetchAuthed('/api/trader/profile', { method:'PUT', body: JSON.stringify(body) }) }
    return r.ok
  }

  function resetForm(){ setEditId(''); setTitle(''); setDescription(''); setDetails(''); setPrice(''); setStatus('LISTED'); setTags('') }

  function startEdit(l){ setEditId(l.id); setTitle(l.title||''); setDescription(l.description||''); setDetails(l.details||''); setPrice(String(l.price||'')); setStatus(l.status||'LISTED'); setTags((l.tags||'').toString()) }

  async function saveListingOnly(){
    // Prefer updating an existing listing if present; only create once
    const existingId = editId || (Array.isArray(listings)&&listings.length>0 ? listings[0].id : '')
    const body = { id: existingId||undefined, providerId, title, description, details, price: Number(price||0), status, tags }
    const isUpdate = !!existingId
    const url = isUpdate ? `/api/trader/listings/${existingId}` : '/api/trader/listings'
    const method = isUpdate ? 'PUT' : 'POST'
    const r = await fetchAuthed(url, { method, body: JSON.stringify(body) })
    if (r.ok){
      const d = await r.json();
      // Ensure subsequent saves update the same listing
      if (!existingId && d?.id) setEditId(d.id)
      if (isUpdate){
        setListings(prev => prev.map(x => x.id===d.id ? d : x))
      } else {
        setListings(prev => [d, ...prev.filter(x=>x.id!==d.id)])
      }
    }
    return r.ok
  }

  async function saveAll(){
    try{
      const okProfile = await saveProfileOnly()
      const okListing = await saveListingOnly()
      if (okProfile || okListing){
        try{ localStorage.setItem(`tx_listing_draft_${providerId}`, JSON.stringify({ editId, title, description, details, price, status, tags })) }catch{}
        alert('Saved')
      } else {
        alert('Nothing saved')
      }
    }catch{ alert('Failed to save') }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Edit trader details</h1>

      <Section title="Profile & services (shown on Trader Details)">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500">Provider ID (demo)</label><Input value={providerId} onChange={setProviderId} placeholder="p2" /></div>
          <div><label className="text-xs text-gray-500">First name</label><Input value={firstName} onChange={setFirstName} placeholder="Milo" /></div>
          <div><label className="text-xs text-gray-500">Last name</label><Input value={lastName} onChange={setLastName} placeholder="Provider" /></div>
          <div><label className="text-xs text-gray-500">Availability</label><Input value={availability} onChange={setAvailability} placeholder="Weekdays 9–5" /></div>
          <div><label className="text-xs text-gray-500">Phone</label><Input value={phone} onChange={setPhone} placeholder="+1 555-123-4567" /></div>
          <div><label className="text-xs text-gray-500">Website</label><Input value={website} onChange={setWebsite} placeholder="https://example.com" /></div>
          <div><label className="text-xs text-gray-500">Location</label><Input value={location} onChange={setLocation} placeholder="City, Country" /></div>
          {/* Hourly rate removed */}
          <div className="sm:col-span-2"><label className="text-xs text-gray-500">Tagline</label><Input value={tagline} onChange={setTagline} placeholder="e.g., Natural light portraits with a modern touch" /></div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500">Bio</label><Input value={bio} onChange={setBio} placeholder="Tell customers about your experience" /></div>
          <div><label className="text-xs text-gray-500">Years experience</label><Input value={experienceYears} onChange={setExperienceYears} placeholder="5" /></div>
          <div><label className="text-xs text-gray-500">Languages</label><Input value={languages} onChange={setLanguages} placeholder="English, Spanish" /></div>
          <div><label className="text-xs text-gray-500">Certifications</label><Input value={certifications} onChange={setCertifications} placeholder="Certified, Licensed" /></div>
          <div><label className="text-xs text-gray-500">Twitter</label><Input value={socialTwitter} onChange={setSocialTwitter} placeholder="https://twitter.com/handle" /></div>
          <div><label className="text-xs text-gray-500">Instagram</label><Input value={socialInstagram} onChange={setSocialInstagram} placeholder="https://instagram.com/handle" /></div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500">Portfolio</label><Input value={portfolio} onChange={setPortfolio} placeholder="https://portfolio.example.com" /></div>
          {/* Services offered (current service) */}
          <div className="sm:col-span-2 mt-4 font-medium text-sm text-gray-800">Services offered</div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500">Title</label><Input value={title} onChange={setTitle} placeholder="Portrait Session — 1 hour" /></div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500">Description</label><Input value={description} onChange={setDescription} placeholder="Describe the service" /></div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500">Details</label><Input value={details} onChange={setDetails} placeholder="Any specific inclusions" /></div>
          <div><label className="text-xs text-gray-500">Price (USD)</label><Input value={price} onChange={setPrice} placeholder="220" /></div>
          <div>
            <label className="text-xs text-gray-500">Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full rounded-xl border p-2">
              <option>LISTED</option>
              <option>DRAFT</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500">Tags (comma separated)</label><Input value={tags} onChange={setTags} placeholder="photo, creative, portrait" /></div>
        </div>
        <div className="mt-3"><Button onClick={saveAll}>Save</Button> <Button variant="ghost" onClick={()=>navigate(`/view/${providerId}`)}>View as customer</Button></div>
      </Section>

      
    </main>
  )
}
