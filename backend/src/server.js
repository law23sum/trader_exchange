import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { OAuth2Client } from 'google-auth-library'
import db from './db.js'
import crypto from 'crypto'
// Optional: req.user can be set by JWT middleware if you mount one


const app = express()
// Disable ETag to prevent 304 responses breaking client fetch logic
app.disable('etag')
app.use((req, res, next) => { res.set('Cache-Control','no-store'); next() })
// CORS: in development, allow all origins; in production, restrict to FRONTEND_ORIGIN or common localhost URLs
const isProd = process.env.NODE_ENV === 'production'
const defaultFrontends = ['http://localhost:5173','http://127.0.0.1:5173']
const envOrigin = process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []
const allowlist = new Set([...defaultFrontends, ...envOrigin])
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (!isProd) return cb(null, true)
    if (allowlist.has(origin)) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// ---- Minimal JWT helpers (compatible with signJWT below) ----
function extractToken(req){
  const authz = req.headers?.authorization || req.headers?.Authorization
  if (authz && typeof authz === 'string'){
    const [typ, tok] = authz.split(' ')
    if (/^Bearer$/i.test(typ) && tok) return tok.trim()
  }
  if (req.cookies && req.cookies.token) return String(req.cookies.token)
  if (req.query && req.query.token) return String(req.query.token)
  return ''
}
function decodeJWT(token){
  const secret = process.env.JWT_SECRET || 'dev-secret'
  const parts = String(token||'').split('.')
  if (parts.length !== 3) throw new Error('bad token')
  const [h, p, s] = parts
  const data = `${h}.${p}`
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  if (sig !== s) throw new Error('bad sig')
  // Decode base64url payload
  const toB64 = (u) => {
    let b = String(u||'').replace(/-/g,'+').replace(/_/g,'/')
    while (b.length % 4) b += '='
    return b
  }
  const payload = JSON.parse(Buffer.from(toB64(p), 'base64').toString('utf8'))
  const now = Math.floor(Date.now()/1000)
  if (payload.exp && now > payload.exp) throw new Error('expired')
  return payload
}
function softAttachUser(req, _res, next){
  try{ const t = extractToken(req); if (t) req.user = decodeJWT(t) }catch{}
  next()
}
function requireAuth(req, res, next){
  try{ const t = extractToken(req); const u = decodeJWT(t); req.user = u; return next() }catch{ return res.status(401).json({ error:'Unauthorized' }) }
}
function requireRole(...roles){
  const allowed = (Array.isArray(roles[0]) ? roles[0] : roles).map(x=>String(x).toUpperCase())
  return (req, res, next) => {
    try{ const t = extractToken(req); const u = decodeJWT(t); req.user = u }catch{ return res.status(401).json({ error:'Unauthorized' }) }
    const r = String(req.user?.role||'').toUpperCase()
    if (allowed.length>0 && !allowed.includes(r)) return res.status(403).json({ error:'Forbidden' })
    return next()
  }
}

// Attach user if token present (non-fatal)
app.use(softAttachUser)

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

// In-memory users fallback when SQLite is unavailable
const usersMem = new Map() // key: lower(email) -> { id,name,email,passwordHash,role,createdAt,providerPlayerId? }
function seedMemUsers(){
  if (db?.available) return
  const now = new Date().toISOString()
  function hash(password){
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.scryptSync(password, salt, 64).toString('hex')
    return `s2:${salt}:${hash}`
  }
  const u1 = { id: Math.random().toString(36).slice(2,10), name:'Demo User', email:'user@example.com', password: hash('password'), role:'USER', createdAt: now }
  const pid = 'p_' + Math.random().toString(36).slice(2,8)
  const u2 = { id: Math.random().toString(36).slice(2,10), name:'Demo Trader', email:'trader@example.com', password: hash('password'), role:'TRADER', createdAt: now, providerPlayerId: pid }
  usersMem.set(u1.email.toLowerCase(), u1)
  usersMem.set(u2.email.toLowerCase(), u2)
}
seedMemUsers()

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
    if (!db?.available){
      const name = String(req.body?.name||'').trim() || 'User'
      const email = String(req.body?.email||'').trim().toLowerCase()
      const password = String(req.body?.password||'')
      const role = (String(req.body?.role||'USER').toUpperCase()==='TRADER') ? 'TRADER' : 'USER'
      if (!email || !password) return res.status(400).json({ error:'Email and password required' })
      const id = Math.random().toString(36).slice(2,10)
      const passwordHash = hashPassword(password)
      usersMem.set(email, { id, name, email, password: passwordHash, role, createdAt: new Date().toISOString() })
      const token = signJWT({ sub:id, email, role })
      const cookieOpts = { httpOnly:true, sameSite:'lax', secure: isProd, path:'/' }
      res.cookie('token', token, cookieOpts)
      return res.json({ token, user:{ id, name, email, role } })
    }
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
    if (!db?.available){
      const email = String(req.body?.email||'').trim().toLowerCase()
      const password = String(req.body?.password||'')
      if (!email || !password) return res.status(400).json({ error:'Email and password required' })
      const row = usersMem.get(email)
      if (!row) return res.status(401).json({ error:'Invalid credentials' })
      if (!verifyPassword(row.password, password)) return res.status(401).json({ error:'Invalid credentials' })
      const token = signJWT({ sub: row.id, email: row.email, role: row.role })
      const cookieOpts = { httpOnly:true, sameSite:'lax', secure: isProd, path:'/' }
      res.cookie('token', token, cookieOpts)
      return res.json({ token, user:{ id: row.id, name: row.name, email: row.email, role: row.role, providerPlayerId: row.providerPlayerId } })
    }
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
// Demo players/listings used when DB is unavailable
const demoPlayers = []
const demoListings = []
function seedDemo(){
  if (demoPlayers.length>0 || demoListings.length>0) return
  const p1 = { id:'p_ava', name:'Ava Provider', role:'PROVIDER', rating:4.8, jobs:124, location:'San Francisco', hourlyRate:85, bio:'Portrait photographer and gardener.' }
  const p2 = { id:'p_milo', name:'Milo Provider', role:'PROVIDER', rating:4.6, jobs:58, location:'New York', hourlyRate:70, bio:'Web developer and tutor.' }
  demoPlayers.push(p1, p2)
  const now = new Date().toISOString()
  demoListings.push(
    { id:'l1', title:'Lawn Care — quarter acre', description:'Mow, trim, and edge. Includes bagging and cleanup.', price:85, providerId:p1.id, status:'LISTED', createdAt: now, tags:'home,outdoor,weekly,lawn,mow' },
    { id:'l2', title:'Portrait Session — 1 hour', description:'Natural light portraits. 10 edited photos included.', price:220, providerId:p2.id, status:'LISTED', createdAt: now, tags:'photo,creative,portrait,camera' },
    { id:'l3', title:'Algebra Tutoring — 60 min', description:'One-on-one algebra lesson over video or in person.', price:45, providerId:p1.id, status:'LISTED', createdAt: now, tags:'education,tutor,math,algebra' },
  )
}
seedDemo()
// In-memory listings for demo when DB is unavailable
const listingsMem = new Map() // providerId -> [ { id,title,description,price,providerId,status,createdAt,tags } ]

// Public players list (basic fields)
app.get('/api/players', (req, res) => {
  try{
    if (db?.available) {
      const rows = db.prepare('SELECT id,name,role,rating,jobs,location,hourlyRate,specialties,bio FROM players').all()
      if (rows && rows.length > 0) return res.json(rows)
    }
  }catch(e){}
  // Without DB, use demo players or synthesize from in-memory listings
  if (demoPlayers.length>0) return res.json(demoPlayers)
  const set = new Map()
  for (const [pid, arr] of listingsMem.entries()){
    if (Array.isArray(arr) && arr.length>0){
      const name = `Provider ${pid}`
      set.set(pid, { id: pid, name, role:'PROVIDER', rating: 0, jobs: 0 })
    }
  }
  return res.json(Array.from(set.values()))
})
// Public listings
app.get('/api/listings', (req, res) => {
  try{
    if (db?.available) {
      const rows = db.prepare('SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings').all()
      if (rows && rows.length > 0) return res.json(rows)
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
      // If not found in DB, fall through to demo/memory fallback
      if (!p) throw new Error('not-found')
      const listings = db.prepare('SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings WHERE providerId=?').all(req.params.id)
      if (p || (listings && listings.length>0)) return res.json({ provider: p, listings })
    }
  }catch(e){}
  // Without DB, return a minimal provider object even if no in-memory listings exist
  const mem = listingsMem.get(req.params.id) || []
  const demo = demoPlayers.find(p => String(p.id)===String(req.params.id)) || null
  const provider = demo || { id: req.params.id, name: 'Provider', role:'PROVIDER', rating: 0, jobs: 0 }
  const demoLs = demoListings.filter(l => String(l.providerId)===String(req.params.id))
  const outListings = (Array.isArray(mem) && mem.length>0) ? mem : demoLs
  return res.json({ provider, listings: Array.isArray(outListings) ? outListings : [] })
})

// Simple search for providers/listings by title/tags; returns { providers, listings }
app.get('/api/search', (req, res) => {
  const q = String(req.query?.q||'').toLowerCase().trim()
  if (!q) return res.json({ providers: [], listings: [] })
  const allProviders = (()=>{
    if (db?.available){
      try{
        const rows = db.prepare('SELECT id,name,role,rating,jobs,location,hourlyRate,bio FROM players').all()
        if (rows && rows.length>0) return rows
      }catch{}
    }
    return demoPlayers
  })()
  const allListings = (()=>{
    if (db?.available){
      try{
        const rows = db.prepare('SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings').all()
        if (rows && rows.length>0) return rows
      }catch{}
    }
    return demoListings
  })()
  const listings = (allListings||[]).filter(l => String(l.title||'').toLowerCase().includes(q) || String(l.tags||'').toLowerCase().includes(q))
  const providerIds = new Set(listings.map(l=>String(l.providerId)))
  const providers = (allProviders||[]).filter(p => providerIds.has(String(p.id)) || String(p.name||'').toLowerCase().includes(q))
  res.json({ providers, listings })
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
app.post('/api/providers/:id/reviews', requireAuth, (req, res) => {
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

app.get('/api/messages', requireAuth, (req, res) => {
  const { traderId } = req.query
  const uid = req.user?.sub || req.user?.id || null
  const rows = messages.filter(m => m.traderId === traderId).map(m => ({ ...m, mine: m.userId === uid }))
  res.json(rows)
})

app.post('/api/messages', requireAuth, (req, res) => {
  const { traderId, text } = req.body
  const msg = { id: String(Date.now()), traderId, userId: req.user?.sub||null, text, ts: Date.now() }
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
app.get('/api/trader/summary', requireRole('TRADER'), (req, res) => {
  res.json({ earnings: 12450.75, jobs: 36, rating: 4.8, clients: 22 })
})
app.get('/api/trader/history', requireRole('TRADER'), (req, res) => {
  res.json(history.map(h => ({ id:h.id, userName:'You', service:h.service, status:h.status })))
})
// Per-user in-memory trader profiles to avoid cross-user leakage
const traderProfiles = new Map() // key: user.sub/email -> profile object
app.get('/api/trader/profile', requireAuth, (req, res) => {
  const key = req.user?.sub || req.user?.email || 'anon'
  const profile = traderProfiles.get(key) || {}
  const full = (req.user?.name||'').trim()
  const firstName = profile.firstName || (full ? full.split(/\s+/)[0] : '')
  const lastName = profile.lastName || (full ? full.split(/\s+/).slice(1).join(' ') : '')
  res.json({ ...profile, firstName, lastName, id: profile.providerId || null })
})
app.put('/api/trader/profile', requireAuth, (req, res) => {
  const key = req.user?.sub || req.user?.email || 'anon'
  const prev = traderProfiles.get(key) || {}
  const next = { ...prev, ...req.body }
  traderProfiles.set(key, next)
  res.json(next)
})

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
  const m = { id: Math.random().toString(36).slice(2,10), conversationId: id, userId: req.user?.sub||null, role:'user', content, createdAt: nowTs }
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
      userName: (req.user && (req.user.name||req.user.email)) || 'Customer',
      customerId: req.user?.sub || null,
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
    const me = req.user?.sub || null
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
// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.get('/health', (_req, res) => res.json({ ok: true }))
app.head('/api/health', (_req, res) => res.status(200).end())
app.head('/health', (_req, res) => res.status(200).end())
