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
  res.json(demoListings)
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
  const listings = demoListings.filter(x=>x.providerId===req.params.id)
  res.json({ provider: p, listings })
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
app.get('/api/trader/profile', requireAuth, (req, res) => res.json(traderProfile))
app.put('/api/trader/profile', requireAuth, (req, res) => { traderProfile = { ...traderProfile, ...req.body }; res.json(traderProfile) })

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API running on :${port}`))
