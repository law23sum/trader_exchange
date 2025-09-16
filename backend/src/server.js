import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { OAuth2Client } from 'google-auth-library'
import db from './db.js'
import crypto from 'crypto'
// Optional: req.user can be set by JWT middleware if you mount one


const app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID)

// --- mock data ---
// sessionUser removed in favor of JWT-based auth
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

// Return current user from req.user (if a JWT middleware set it) or from demo session
app.get('/api/me', (req, res) => {
  try{
    const u = req.user || null
    if (!u) return res.status(401).json({ error:'No session' })
    const id = u.id || u.sub || null
    const email = u.email || null
    const role = u.role || null
    return res.json({ id, email, role })
  }catch{ return res.status(401).json({ error:'No session' }) }
})

// --- Auth: signup/signin with password hashing + JWT cookie ---
function b64url(input){
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
}
function signJWT(payload){
  const header = { alg:'HS256', typ:'JWT' }
  const sec = process.env.JWT_SECRET || 'dev-secret'
  const now = Math.floor(Date.now()/1000)
  const exp = now + 60*60*24*7 // 7 days
  const body = { ...payload, iat: now, exp }
  const p1 = b64url(JSON.stringify(header))
  const p2 = b64url(JSON.stringify(body))
  const data = `${p1}.${p2}`
  const sig = crypto.createHmac('sha256', sec).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  return `${data}.${sig}`
}
function hashPassword(password){
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `s2:${salt}:${hash}`
}
function verifyPassword(stored, input){
  if (!stored) return false
  if (stored.startsWith('s2:')){
    const [, salt, hash] = stored.split(':')
    const calc = crypto.scryptSync(input, salt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash,'hex'), Buffer.from(calc,'hex'))
  }
  // Fallback: legacy plain (not recommended)
  return stored === input
}

app.post('/api/signup', (req, res) => {
  try{
    if (!db?.available) return res.status(500).json({ error:'DB unavailable' })
    const name = String(req.body?.name||'').trim() || 'User'
    const email = String(req.body?.email||'').trim().toLowerCase()
    const password = String(req.body?.password||'')
    const role = (String(req.body?.role||'USER').toUpperCase()==='TRADER') ? 'TRADER' : 'USER'
    if (!email || !password) return res.status(400).json({ error:'Email and password required' })
    const now = new Date().toISOString()
    const id = Math.random().toString(36).slice(2,10)
    const passwordHash = hashPassword(password)
    try{
      db.prepare('INSERT INTO users (id,name,email,password,role,createdAt) VALUES (?,?,?,?,?,?)').run(id, name, email, passwordHash, role, now)
    }catch(e){
      // If email exists, update name/role and password
      try{ db.prepare('UPDATE users SET name=?, password=?, role=? WHERE lower(email)=lower(?)').run(name, passwordHash, role, email) }catch{}
    }
    const token = signJWT({ sub:id, email, role })
    const cookieOpts = { httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production', path:'/' }
    res.cookie('token', token, cookieOpts)
    return res.json({ token, user:{ id, name, email, role } })
  }catch{ return res.status(500).json({ error:'Signup failed' }) }
})

app.post('/api/signin', (req, res) => {
  try{
    if (!db?.available) return res.status(500).json({ error:'DB unavailable' })
    const email = String(req.body?.email||'').trim().toLowerCase()
    const password = String(req.body?.password||'')
    if (!email || !password) return res.status(400).json({ error:'Email and password required' })
    const row = db.prepare('SELECT id,name,email,password,role,providerPlayerId FROM users WHERE lower(email)=lower(?)').get(email)
    if (!row) return res.status(401).json({ error:'Invalid credentials' })
    if (!verifyPassword(row.password, password)) return res.status(401).json({ error:'Invalid credentials' })
    const token = signJWT({ sub: row.id, email: row.email, role: row.role })
    const cookieOpts = { httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production', path:'/' }
    res.cookie('token', token, cookieOpts)
    return res.json({ token, user:{ id: row.id, name: row.name, email: row.email, role: row.role, providerPlayerId: row.providerPlayerId } })
  }catch{ return res.status(500).json({ error:'Signin failed' }) }
})

app.post('/api/signout', (req, res) => {
  try{ res.clearCookie('token', { httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production', path:'/' }) }catch{}
  return res.json({ ok:true })
})

// Remove legacy requireAuth; rely on JWT-based middleware if needed

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body
    const ticket = await oauthClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    const token = signJWT({ sub: payload.sub, email: payload.email, role: 'USER', name: payload.name })
    const cookieOpts = { httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production', path:'/' }
    res.cookie('token', token, cookieOpts)
    res.json({ token, user:{ id: payload.sub, email: payload.email, role:'USER', name: payload.name } })
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
// No demo players/listings; rely on DB or in-memory created content
const demoPlayers = []
const demoListings = []
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
  res.json([])
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
  // Without DB, return a minimal provider object even if no in-memory listings exist
  const mem = listingsMem.get(req.params.id) || []
  const provider = { id: req.params.id, name: 'Provider', role:'PROVIDER', rating: 0, jobs: 0 }
  return res.json({ provider, listings: Array.isArray(mem) ? mem : [] })
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

// Reviews (in-memory demo)
const providerReviews = new Map() // providerId -> [ {id, author, rating, text, at, userId} ]
app.get('/api/providers/:id/reviews', (req, res) => {
  try{ return res.json(providerReviews.get(req.params.id) || []) }catch{ return res.json([]) }
})
app.post('/api/providers/:id/reviews', jwtRequireAuth, (req, res) => {
  try{
    const pid = req.params.id
    const { rating, text } = req.body||{}
    const r = { id: Math.random().toString(36).slice(2,10), author: req.user?.name||'Customer', rating: Math.max(1, Math.min(5, Number(rating||0))), text: String(text||'').slice(0, 2000), at: new Date().toISOString(), userId: (req.user?.sub||null) }
    const arr = providerReviews.get(pid) || []
    arr.unshift(r); providerReviews.set(pid, arr)
    res.json({ ok:true, review:r })
  }catch{ res.status(400).json({ ok:false }) }
})
app.get('/api/history', requireAuth, (req, res) => res.json(history))
app.get('/api/favorites', requireAuth, (req, res) => res.json(favorites))

app.get('/api/traders/:id', requireAuth, (req, res) => {
  const t = traders.find(x => x.id === req.params.id)
  if (!t) return res.status(404).json({ message:'Not found' })
  res.json(t)
})

app.get('/api/messages', jwtRequireAuth, (req, res) => {
  const { traderId } = req.query
  const uid = req.user?.sub || req.user?.id || null
  const rows = messages.filter(m => m.traderId === traderId).map(m => ({ ...m, mine: m.userId === uid }))
  res.json(rows)
})

app.post('/api/messages', jwtRequireAuth, (req, res) => {
  const { traderId, text } = req.body
  const msg = { id: String(Date.now()), traderId, userId: sessionUser.sub, text, ts: Date.now() }
  messages.push(msg)
  res.status(201).json(msg)
})

// Checkout (demo)
app.post('/api/checkout/session', jwtRequireAuth, (req, res) => {
  const { traderId, quantity = 1 } = req.body
  const t = traders.find(x => x.id === traderId)
  if (!t) return res.status(404).json({ message:'Trader not found' })
  const amount = t.rate * quantity
  const lineItems = { quantity }
  history.unshift({ id:String(Date.now()), traderId:t.id, traderName:t.name, service:'Custom service', status:'pending' })
  res.json({ trader: { id:t.id, name:t.name, rate:t.rate }, amount, lineItems })
})

app.post('/api/checkout/pay', jwtRequireAuth, (req, res) => {
  const pending = history.find(h => h.status === 'pending')
  if (pending) pending.status = 'paid'
  res.json({ ok:true })
})

// Trader routes
app.get('/api/trader/summary', requireRole('TRADER'), (req, res) => {
  res.json({ earnings: 12450.75, jobs: 36, rating: 4.8, clients: 22 })
})
app.get('/api/trader/history', requireRole('TRADER'), (req, res) => {
  res.json(history.map(h => ({ id:h.id, userName:'You', service:h.service, status:h.status })))
})
// Per-user in-memory trader profiles to avoid cross-user leakage
const traderProfiles = new Map() // key: sessionUser.sub/email -> profile object
app.get('/api/trader/profile', requireAuth, (req, res) => {
  const key = sessionUser?.sub || sessionUser?.email || 'anon'
  const profile = traderProfiles.get(key) || {}
  const full = (sessionUser?.name||'').trim()
  const firstName = profile.firstName || (full ? full.split(/\s+/)[0] : '')
  const lastName = profile.lastName || (full ? full.split(/\s+/).slice(1).join(' ') : '')
  res.json({ ...profile, firstName, lastName, id: profile.providerId || null })
})
app.put('/api/trader/profile', requireAuth, (req, res) => {
  const key = sessionUser?.sub || sessionUser?.email || 'anon'
  const prev = traderProfiles.get(key) || {}
  const next = { ...prev, ...req.body }
  traderProfiles.set(key, next)
  res.json(next)
})

// Conversations API (in-memory demo)
app.get('/api/conversations', jwtRequireAuth, (req, res) => {
  res.json(conversationsMem)
})
app.post('/api/conversations', jwtRequireAuth, (req, res) => {
  const id = Math.random().toString(36).slice(2,10)
  const conv = { id, kind: (req.body?.kind||'AI'), title: req.body?.title||'AI Chat', createdAt: new Date().toISOString(), lastMessage: '' }
  conversationsMem.unshift(conv)
  msgsMem.set(id, [])
  res.json(conv)
})
app.get('/api/conversations/:id/messages', jwtRequireAuth, (req, res) => {
  res.json(msgsMem.get(req.params.id) || [])
})
app.post('/api/conversations/:id/messages', jwtRequireAuth, async (req, res) => {
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
app.get('/api/trader/orders', requireRole('TRADER'), (req, res) => {
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
app.post('/api/trader/orders/:id/action', requireRole('TRADER'), (req, res) => {
  const { action } = req.body || {}
  const id = req.params.id
  const item = history.find(h => h.id === id)
  if (!item) return res.status(404).json({ message:'Order not found' })
  const map = { approve:'approved', deny:'denied', refund:'refunded', discuss:'discuss', exchange:'exchange', complete:'complete' }
  const next = map[String(action||'').toLowerCase()]
  if (!next) return res.status(400).json({ message:'Invalid action' })
  item.status = next
  if (next === 'approved') {
    item.request = { ...(item.request||{}), ack:true }
  }
  res.json({ ok:true, order: item })
})

// Create an order from a service request (demo)
app.post('/api/orders/request', jwtRequireAuth, (req, res) => {
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
