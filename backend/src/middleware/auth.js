// Authentication/authorization middlewares for the Node backend (ESM)
// Exposes: verifyJWT, requireAuth, requireRole

import jwt from 'jsonwebtoken'

const DEFAULT_ALGOS = ['HS256', 'HS384', 'HS512']

function extractToken(req){
  // Authorization: Bearer <token>
  const authz = req.headers?.authorization || req.headers?.Authorization
  if (authz && typeof authz === 'string'){
    const parts = authz.split(' ')
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1].trim()
  }
  // Fallback to cookie named "token"
  if (req.cookies && req.cookies.token) return String(req.cookies.token)
  // Query fallback (dev tools/testing): ?token=...
  if (req.query && req.query.token) return String(req.query.token)
  return ''
}

export function verifyJWT(req, res, next){
  try{
    const token = extractToken(req)
    if (!token){ return res.status(401).json({ error:'Missing token' }) }
    const secret = process.env.JWT_SECRET || 'dev-secret'
    const decoded = jwt.verify(token, secret, { algorithms: DEFAULT_ALGOS })
    req.user = decoded && typeof decoded === 'object' ? decoded : { sub: decoded }
    return next()
  }catch(e){
    return res.status(401).json({ error:'Invalid or expired token' })
  }
}

export function requireAuth(req, res, next){
  // If a previous middleware already set req.user, honor it
  if (req.user && (req.user.sub || req.user.id || req.user.email)) return next()
  // Otherwise, attempt to verify now
  return verifyJWT(req, res, next)
}

export function requireRole(...roles){
  // Support requireRole('ADMIN') or requireRole('TRADER','ADMIN') or requireRole(['TRADER','ADMIN'])
  const flat = Array.isArray(roles[0]) ? roles[0] : roles
  const allowed = (flat || []).map(r => String(r).toUpperCase())
  return (req, res, next) => {
    const done = () => {
      const role = String(req.user?.role || '').toUpperCase()
      if (!role) return res.status(403).json({ error:'Forbidden' })
      if (allowed.length>0 && !allowed.includes(role)) return res.status(403).json({ error:'Forbidden' })
      return next()
    }
    if (req.user) return done()
    // Verify token if not present
    verifyJWT(req, res, err => { if (err) return; done() })
  }
}

export default { verifyJWT, requireAuth, requireRole }

