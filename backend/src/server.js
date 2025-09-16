import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { OAuth2Client } from 'google-auth-library'
import db from './db.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID)

// --- mock data ---
let sessionUser = null // NOTE: replace with real sessions/JWT in production
const traders = [
  { id:'t1', name:'Ava Codes', bio:'Full‑stack engineer', skills:['React','Spring'], rate:85, availability:'Weekdays', portfolio:[], reviews:[{user:'Sam', rating:5, text:'Great work'}] },
  { id:'t2', name:'Ben Build', bio:'Backend specialist', skills:['Node','Postgres'], rate:70, availability:'Evenings', portfolio:[], reviews:[] }
]
const categories = [
  { id:'c1', name:'Web Development', traders:[{id:'t1', name:'Ava Codes'},{id:'t2', name:'Ben Build'}] },
  { id:'c2', name:'Data & AI', traders:[{id:'t2', name:'Ben Build'}] }
]
let messages = [] // {id, traderId, userId, text, ts}
let history = []  // {id, traderId, traderName, service, status}
let favorites = [{ id:'t1', name:'Ava Codes' }]
// Simple in-memory conversations when DB isn't used
let conversationsMem = [] // { id, kind, title, createdAt, lastMessage }
const msgsMem = new Map() // convId -> [ {id, conversationId, userId, role, content, createdAt} ]

function requireAuth(req, res, next) {
  if (!sessionUser) return res.status(401).json({ message: 'not authenticated' })
  next()
}

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body
    const ticket = await oauthClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    sessionUser = { sub: payload.sub, email: payload.email, name: payload.name, role: sessionUser?.role || null }
    res.json(sessionUser)
  } catch (e) {
    res.status(400).json({ message: 'Invalid Google token' })
  }
})

// Public categories from DB tags (fallback to demo list if no data)
app.get('/api/categories', (req, res) => {
  try{
    const rows = db.prepare('SELECT tags FROM listings WHERE tags IS NOT NULL AND TRIM(tags)<>""').all()
    const set = new Set()
    for(const r of rows){ String(r.tags||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(t=>set.add(t)) }
    const arr = Array.from(set)
    if (arr.length>0) return res.json(arr)
  }catch{}
  res.json(['home','outdoor','photo','creative','tutor','algebra'])
})
// Demo public data (fallback when DB is unavailable)
const demoPlayers = [
  { id: 'p1', name: 'Ava Provider', role:'PROVIDER', rating:4.8, jobs:124, location:'Austin, TX', hourlyRate:75, specialties:'lawn, weekly', bio:'Reliable outdoor work.' },
  { id: 'p2', name: 'Milo Provider', role:'PROVIDER', rating:4.6, jobs:58, location:'Seattle, WA', hourlyRate:120, specialties:'photo, portrait', bio:'Natural light portraits.' },
]
const demoListings = [
  { id:'l1', title:'Lawn Care — quarter acre', description:'Mow, trim, and edge.', price:85, providerId:'p1', status:'LISTED', createdAt:new Date().toISOString(), tags:'home,outdoor,weekly,lawn,mow' },
  { id:'l2', title:'Portrait Session — 1 hour', description:'Natural light portraits.', price:220, providerId:'p2', status:'LISTED', createdAt:new Date().toISOString(), tags:'photo,creative,portrait,camera' },
]
// In-memory listings for demo when DB is unavailable
const listingsMem = new Map() // providerId -> [ { id,title,description,price,providerId,status,createdAt,tags } ]

// Public players list (basic fields)
app.get('/api/players', (req, res) => {
  try{
    if (db?.available) {
      const rows = db.prepare('SELECT id,name,role,rating,jobs,location,hourlyRate,specialties,bio FROM players').all()
      return res.json(rows)
    }
  }catch(e){}
  res.json(demoPlayers)
})
// Public listings
app.get('/api/listings', (req, res) => {
  try{
    if (db?.available) {
      const rows = db.prepare('SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings').all()
      return res.json(rows)
    }
  }catch(e){}
  // Use trader-created listings when present for a provider; otherwise fallback to demo
  const memEntries = Array.from(listingsMem.entries()) // [providerId, arr]
  const memProviders = new Set(memEntries.filter(([,arr]) => Array.isArray(arr) && arr.length>0).map(([pid]) => pid))
  const demoFiltered = demoListings.filter(l => !memProviders.has(l.providerId))
  const memAll = memEntries.flatMap(([,arr]) => arr || [])
  res.json([...demoFiltered, ...memAll])
})
// Public provider details + listings
app.get('/api/providers/:id', (req, res) => {
  try{
    if (db?.available) {
      const p = db.prepare('SELECT * FROM players WHERE id=?').get(req.params.id)
      if (!p) return res.status(404).json({ message:'Not found' })
      const listings = db.prepare('SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings WHERE providerId=?').all(req.params.id)
      return res.json({ provider: p, listings })
    }
  }catch(e){}
  const p = demoPlayers.find(x=>x.id===req.params.id)
  if (!p) return res.status(404).json({ message:'Not found' })
  const mem = listingsMem.get(req.params.id) || []
  const listings = (Array.isArray(mem) && mem.length>0)
    ? mem
    : demoListings.filter(x=>x.providerId===req.params.id)
  res.json({ provider: p, listings })
})

// Trader listings CRUD (demo/in-memory when DB not available)
app.get('/api/trader/listings', requireAuth, (req, res) => {
  try{
    if (db?.available){
      const pid = String(req.query?.providerId||'')
      const sql = pid ? 'SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings WHERE providerId=?' : 'SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings'
      const rows = pid ? db.prepare(sql).all(pid) : db.prepare(sql).all()
      return res.json(rows)
    }
  }catch{}
  const pid = String(req.query?.providerId||'')
  if (pid){ return res.json([...(listingsMem.get(pid)||[])]) }
  // no providerId supplied: return all in-memory listings
  res.json(Array.from(listingsMem.values()).flat())
})
app.post('/api/trader/listings', requireAuth, (req, res) => {
  const b = req.body||{}
  const now = new Date().toISOString()
  try{
    if (db?.available){
      const id = Math.random().toString(36).slice(2,10)
      const row = { id, title:b.title||'Untitled', description:b.description||'', price:Number(b.price||0), providerId:String(b.providerId||''), status:b.status||'LISTED', createdAt: now, tags: String(b.tags||'') }
      db.prepare('INSERT INTO listings (id,title,description,price,providerId,status,createdAt,tags) VALUES (@id,@title,@description,@price,@providerId,@status,@createdAt,@tags)').run(row)
      return res.json(row)
    }
  }catch(e){}
  const pid = String(b.providerId||'')
  const id = Math.random().toString(36).slice(2,10)
  const row = { id, title:b.title||'Untitled', description:b.description||'', price:Number(b.price||0), providerId: pid, status:b.status||'LISTED', createdAt: now, tags: String(b.tags||'') }
  const arr = listingsMem.get(pid) || []
  arr.unshift(row)
  listingsMem.set(pid, arr)
  res.json(row)
})
app.put('/api/trader/listings/:id', requireAuth, (req, res) => {
  const id = req.params.id
  const b = req.body||{}
  try{
    if (db?.available){
      const prev = db.prepare('SELECT id FROM listings WHERE id=?').get(id)
      if (!prev) return res.status(404).json({ message:'Not found' })
      const row = { id, title:b.title||'Untitled', description:b.description||'', price:Number(b.price||0), providerId:String(b.providerId||''), status:b.status||'LISTED', tags: String(b.tags||'') }
      db.prepare('UPDATE listings SET title=@title,description=@description,price=@price,providerId=@providerId,status=@status,tags=@tags WHERE id=@id').run(row)
      return res.json({ ...row, createdAt: prev.createdAt || new Date().toISOString() })
    }
  }catch(e){}
  // Update in-memory
  let found = null
  for (const [pid, arr] of listingsMem.entries()){
    const idx = arr.findIndex(x=>x.id===id)
    if (idx>=0){ arr[idx] = { ...arr[idx], ...b, id }; listingsMem.set(pid, arr); found = arr[idx]; break; }
  }
  if (!found) return res.status(404).json({ message:'Not found' })
  res.json(found)
})

// Reviews (demo)
app.get('/api/providers/:id/reviews', (req, res) => {
  try{
    let prov = null
    if (db?.available) prov = db.prepare('SELECT name,rating FROM players WHERE id=?').get(req.params.id)
    if (!prov) prov = demoPlayers.find(x=>x.id===req.params.id)
    const base = Math.max(1, Math.round((prov?.rating||4.5)))
    const reviews = Array.from({ length: 4 }, (_,i)=>({
      id: `rvw_${i}`,
      author: ['Alex','Sam','Rae','Kai'][i%4],
      rating: Math.max(3, Math.min(5, base + (i%2?0:-1))),
      text: i%2? 'Great communication and timely delivery.' : 'Quality work, would recommend.',
      at: new Date(Date.now()- (i+1)*86400000).toISOString()
    }))
    res.json(reviews)
  }catch{ res.json([]) }
})
app.get('/api/history', requireAuth, (req, res) => res.json(history))
app.get('/api/favorites', requireAuth, (req, res) => res.json(favorites))

app.get('/api/traders/:id', requireAuth, (req, res) => {
  const t = traders.find(x => x.id === req.params.id)
  if (!t) return res.status(404).json({ message:'Not found' })
  res.json(t)
})

app.get('/api/messages', requireAuth, (req, res) => {
  const { traderId } = req.query
  const rows = messages.filter(m => m.traderId === traderId).map(m => ({ ...m, mine: m.userId === sessionUser.sub }))
  res.json(rows)
})

app.post('/api/messages', requireAuth, (req, res) => {
  const { traderId, text } = req.body
  const msg = { id: String(Date.now()), traderId, userId: sessionUser.sub, text, ts: Date.now() }
  messages.push(msg)
  res.status(201).json(msg)
})

// Checkout (demo)
app.post('/api/checkout/session', requireAuth, (req, res) => {
  const { traderId, quantity = 1 } = req.body
  const t = traders.find(x => x.id === traderId)
  if (!t) return res.status(404).json({ message:'Trader not found' })
  const amount = t.rate * quantity
  const lineItems = { quantity }
  history.unshift({ id:String(Date.now()), traderId:t.id, traderName:t.name, service:'Custom service', status:'pending' })
  res.json({ trader: { id:t.id, name:t.name, rate:t.rate }, amount, lineItems })
})

app.post('/api/checkout/pay', requireAuth, (req, res) => {
  const pending = history.find(h => h.status === 'pending')
  if (pending) pending.status = 'paid'
  res.json({ ok:true })
})

// Trader routes
app.get('/api/trader/summary', requireAuth, (req, res) => {
  res.json({ earnings: 12450.75, jobs: 36, rating: 4.8, clients: 22 })
})
app.get('/api/trader/history', requireAuth, (req, res) => {
  res.json(history.map(h => ({ id:h.id, userName:'You', service:h.service, status:h.status })))
})
let traderProfile = { bio:'Full‑stack engineer', skills:'React, Spring', rate:85, availability:'Weekdays' }
app.get('/api/trader/profile', requireAuth, (req, res) => {
  const full = (sessionUser?.name||'').trim()
  const firstName = traderProfile.firstName || (full ? full.split(/\s+/)[0] : '')
  const lastName = traderProfile.lastName || (full ? full.split(/\s+/).slice(1).join(' ') : '')
  res.json({ ...traderProfile, firstName, lastName })
})
app.put('/api/trader/profile', requireAuth, (req, res) => { traderProfile = { ...traderProfile, ...req.body }; res.json(traderProfile) })

// Conversations API (in-memory demo)
app.get('/api/conversations', requireAuth, (req, res) => {
  res.json(conversationsMem)
})
app.post('/api/conversations', requireAuth, (req, res) => {
  const id = Math.random().toString(36).slice(2,10)
  const conv = { id, kind: (req.body?.kind||'AI'), title: req.body?.title||'AI Chat', createdAt: new Date().toISOString(), lastMessage: '' }
  conversationsMem.unshift(conv)
  msgsMem.set(id, [])
  res.json(conv)
})
app.get('/api/conversations/:id/messages', requireAuth, (req, res) => {
  res.json(msgsMem.get(req.params.id) || [])
})
app.post('/api/conversations/:id/messages', requireAuth, async (req, res) => {
  const id = req.params.id
  const content = String(req.body?.content||'')
  const nowTs = new Date().toISOString()
  const arr = msgsMem.get(id) || []
  const m = { id: Math.random().toString(36).slice(2,10), conversationId: id, userId: sessionUser?.sub||null, role:'user', content, createdAt: nowTs }
  arr.push(m)
  // Simple echo assistant reply
  const a = { id: Math.random().toString(36).slice(2,10), conversationId: id, userId: null, role:'assistant', content: `You said: ${content}`, createdAt: new Date().toISOString() }
  arr.push(a)
  msgsMem.set(id, arr)
  const idx = conversationsMem.findIndex(c=>c.id===id); if (idx>=0) conversationsMem[idx].lastMessage = a.content
  // Link customer message to related order (service management visibility)
  try{
    const orderIdx = history.findIndex(h => (h?.request?.conversationId || h?.conversationId) === id)
    if (orderIdx >= 0){
      const h = history[orderIdx]
      const updates = Array.isArray(h.request?.updates) ? h.request.updates : []
      const next = { at: nowTs, from: 'customer', message: content }
      const nextReq = { ...(h.request||{}), updates: [...updates, next], lastMessage: content, updatedAt: nowTs, conversationId: h.request?.conversationId || id }
      history[orderIdx] = { ...h, request: nextReq }
    }
  }catch{}
  res.json({ ok:true, message:m, assistant:a })
})

// Orders management (demo uses same in-memory history list)
app.get('/api/trader/orders', requireAuth, (req, res) => {
  // In a real app, filter by current trader user
  const rows = history.map(h => ({
    id: h.id,
    userName: h.userName||'Customer',
    service: h.service,
    status: h.status,
    amount: h.amount||0,
    createdAt: h.createdAt,
    request: h.request || null,
    conversationId: h.conversationId || (h.request?.conversationId || null),
  }))
  res.json(rows)
})
app.post('/api/trader/orders/:id/action', requireAuth, (req, res) => {
  const { action } = req.body || {}
  const id = req.params.id
  const item = history.find(h => h.id === id)
  if (!item) return res.status(404).json({ message:'Order not found' })
  const map = { approve:'approved', deny:'denied', refund:'refunded', discuss:'discuss', exchange:'exchange' }
  const next = map[String(action||'').toLowerCase()]
  if (!next) return res.status(400).json({ message:'Invalid action' })
  item.status = next
  if (next === 'approved') {
    item.request = { ...(item.request||{}), ack:true }
  }
  res.json({ ok:true, order: item })
})

// Create an order from a service request (demo)
app.post('/api/orders/request', requireAuth, (req, res) => {
  try{
    const { providerId, listingId, title, details, date, time, conversationId } = req.body||{}
    const item = {
      id: String(Date.now()),
      traderId: providerId||null,
      traderName: 'You',
      service: title||'Service request',
      status: 'discuss',
      amount: 0,
      createdAt: new Date().toISOString(),
      userName: (sessionUser && (sessionUser.name||sessionUser.email)) || 'Customer',
      customerId: sessionUser?.sub || null,
      listingId: listingId || null,
      providerId: providerId || null,
      conversationId: conversationId || null,
      request: { details: details||'', date: date||'', time: time||'', ack:false, conversationId: conversationId || null, updates: [] },
    }
    history.unshift(item)
    res.json({ ok:true, order:item })
  }catch(e){ res.status(400).json({ message:'Invalid request' }) }
})

// Customer-visible status for their own request
app.get('/api/orders/status', requireAuth, (req, res) => {
  try{
    const { providerId, listingId } = req.query || {}
    const me = sessionUser?.sub || null
    const match = history.find(h => (
      (me && h.customerId === me) &&
      (String(h.providerId||'') === String(providerId||'')) &&
      (String(h.listingId||'') === String(listingId||''))
    ))
    if (!match) return res.json({ ok:true, found:false, status:'none', ack:false })
    const ack = Boolean(match?.request?.ack) || String(match.status||'').toLowerCase()==='approved'
    return res.json({ ok:true, found:true, status: match.status, ack, conversationId: match.conversationId || match.request?.conversationId || null, updatedAt: match.request?.updatedAt||match.createdAt })
  }catch(e){ return res.status(400).json({ ok:false, message:'Invalid query' }) }
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API running on :${port}`))
