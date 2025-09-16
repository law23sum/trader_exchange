// Simple mock API to enable login and browsing without a backend
export function isMock(){
  return (import.meta?.env?.VITE_MOCK === '1') || localStorage.getItem('tx_mock') === '1';
}

function res(status, data){
  return {
    ok: status >= 200 && status < 300,
    status,
    async json(){ return data },
    async text(){ try{ return JSON.stringify(data) }catch{ return '' } },
  };
}

function getToken(){ return localStorage.getItem('tx_token') || '' }
function setToken(t){ t ? localStorage.setItem('tx_token', t) : localStorage.removeItem('tx_token') }

// ---- User registry keyed by email (unique identifier) ----
function readUserRegistry(){
  try{ return JSON.parse(localStorage.getItem('tx_users')||'{}') }catch{ return {} }
}
function writeUserRegistry(reg){ localStorage.setItem('tx_users', JSON.stringify(reg||{})) }
function getUserByEmail(email){
  const key = (email||'').trim().toLowerCase(); if(!key) return null;
  const reg = readUserRegistry(); return reg[key] || null
}
function putUser(user){
  const key = (user?.email||'').trim().toLowerCase(); if(!key) return user;
  const reg = readUserRegistry(); reg[key] = user; writeUserRegistry(reg); return user
}
function stableTokenFor(email){ return 'tok_' + (email||'').trim().toLowerCase() }

function readRoleRegistry(){
  try{ return JSON.parse(localStorage.getItem('tx_roles')||'{}') }catch{ return {} }
}
function writeRoleRegistry(reg){ localStorage.setItem('tx_roles', JSON.stringify(reg||{})) }
function getRoleForEmail(email){
  const reg = readRoleRegistry(); const key = (email||'').trim().toLowerCase();
  return (reg && reg[key]) || ''
}
function setRoleForEmail(email, role){
  const key = (email||'').trim().toLowerCase(); if (!key) return;
  const reg = readRoleRegistry(); reg[key] = (role && role.toUpperCase()==='TRADER') ? 'TRADER' : 'USER'; writeRoleRegistry(reg);
}

function getUser(){ try{ return JSON.parse(localStorage.getItem('tx_user')||'null') }catch{ return null } }
function setUser(u){ if (u) localStorage.setItem('tx_user', JSON.stringify(u)); else localStorage.removeItem('tx_user') }
const uid = () => Math.random().toString(36).slice(2,10)

export async function mockFetch(path, opts={}){
  const method = (opts.method || 'GET').toUpperCase();
  const now = new Date().toISOString();
  const body = (() => { try{ return opts.body ? JSON.parse(opts.body) : {} }catch{ return {} } })();
  const token = (opts.headers?.Authorization || '').startsWith('Bearer ') ? opts.headers.Authorization.slice(7) : getToken();
  const getConvs = () => { try{ return JSON.parse(localStorage.getItem('tx_convs')||'[]') }catch{ return [] } }
  const setConvs = (v) => localStorage.setItem('tx_convs', JSON.stringify(v))
  const getMsgs = (cid) => { try{ return JSON.parse(localStorage.getItem(`tx_msgs_${cid}`)||'[]') }catch{ return [] } }
  const setMsgs = (cid, v) => localStorage.setItem(`tx_msgs_${cid}`, JSON.stringify(v))

  // Auth endpoints
  if (path === '/api/signin' && method === 'POST'){
    const email = (body.email || 'user@example.com').trim().toLowerCase();
    const name = email.split('@')[0] || 'User';
    let user = getUserByEmail(email);
    if (!user){
      const hinted = (localStorage.getItem('tx_last_role')||'').toUpperCase();
      const regRole = getRoleForEmail(email);
      const role = (regRole==='TRADER'||regRole==='USER') ? regRole : (hinted==='TRADER'?'TRADER': hinted==='USER'?'USER' : (email.includes('trader')?'TRADER':'USER'))
      user = { id: uid(), name, email, role, createdAt: now };
    } else {
      user = { ...user, name: name || user.name };
    }
    putUser(user); setRoleForEmail(email, user.role); setUser(user);
    const t = stableTokenFor(email); setToken(t); return res(200, { token: t, user });
  }

  if (path === '/api/signup' && method === 'POST'){
    const email = (body.email || 'user@example.com').trim().toLowerCase();
    const name = body.name || email.split('@')[0] || 'User';
    const role = (body.role||'USER').toUpperCase() === 'TRADER' ? 'TRADER' : 'USER';
    let existing = getUserByEmail(email);
    if (existing){ existing.name=name; existing.role=role; putUser(existing); setRoleForEmail(email, role); setUser(existing); const t = stableTokenFor(email); setToken(t); return res(200,{ token:t, user: existing }); }
    const user = { id: uid(), name, email, role, createdAt: now };
    putUser(user); setRoleForEmail(email, role); setUser(user);
    const t = stableTokenFor(email); setToken(t); return res(200, { token: t, user });
  }

  if (path === '/api/auth/google' && method === 'POST'){
    const email = 'google_user@example.com';
    let user = getUserByEmail(email);
    if (!user){
      const last = (localStorage.getItem('tx_last_role')||'').toUpperCase();
      const regRole = getRoleForEmail(email);
      const role = (regRole==='TRADER'||regRole==='USER') ? regRole : (last==='TRADER'?'TRADER':'USER');
      user = { id: uid(), name: 'Google User', email, role, createdAt: now };
    }
    putUser(user); setRoleForEmail(email, user.role); setUser(user);
    const t = stableTokenFor(email); setToken(t); return res(200, { token: t, user });
  }

  if (path === '/api/signout' && method === 'POST'){
    setToken(''); setUser(null);
    return res(200, { ok:true });
  }
  if (path === '/api/me' && method === 'GET'){
    if (!token) return res(401, { error:'No token' });
    const u = getUser(); if (!u) return res(401, { error:'Invalid token' });
    return res(200, u);
  }
  if (path === '/api/become-provider' && method === 'POST'){
    if (!token) return res(401, { error:'No token' });
    const u = getUser() || { id: uid(), name:'User', email:'user@example.com', role:'USER', createdAt: now };
    const nu = { ...u, role:'TRADER' };
    setUser(nu);
    return res(200, { ok:true, user: nu, providerId: 'p-mock' });
  }

  // Conversations (mocked in localStorage)
  if (path === '/api/conversations' && method === 'GET'){
    if (!token) return res(401, { error:'No token' });
    return res(200, getConvs())
  }
  if (path === '/api/conversations' && method === 'POST'){
    if (!token) return res(401, { error:'No token' });
    const conv = { id: uid(), kind: (body.kind||'AI'), title: body.title||'AI Chat', createdAt: now, lastMessage:'' }
    const all = getConvs(); all.unshift(conv); setConvs(all)
    setMsgs(conv.id, [])
    return res(200, conv)
  }
  const msgListMatch = path.match(/^\/api\/conversations\/([^/]+)\/messages$/)
  if (msgListMatch && method === 'GET'){
    if (!token) return res(401, { error:'No token' });
    const cid = msgListMatch[1];
    return res(200, getMsgs(cid))
  }
  if (msgListMatch && method === 'POST'){
    if (!token) return res(401, { error:'No token' });
    const cid = msgListMatch[1]
    const user = getUser();
    const msgs = getMsgs(cid)
    const m = { id: uid(), conversationId: cid, userId: user?.id||null, role:'user', content: String(body.content||''), createdAt: now }
    msgs.push(m)
    const a = { id: uid(), conversationId: cid, userId: null, role:'assistant', content: `You said: ${m.content}`, createdAt: now }
    msgs.push(a)
    setMsgs(cid, msgs)
    const all = getConvs(); const idx = all.findIndex(c=>c.id===cid); if (idx>=0){ all[idx].lastMessage = a.content; setConvs(all) }
    return res(200, { ok:true, message:m, assistant:a })
  }

  // Public data
  if (path === '/api/categories' && method === 'GET'){
    return res(200, ['home','outdoor','photo','creative','tutor','algebra']);
  }
  if (path === '/api/players' && method === 'GET'){
    return res(200, [
      { id: 'p1', name: 'Ava Provider', role:'PROVIDER', rating:4.8, jobs:124, location:'Austin, TX', hourlyRate:75, specialties:'lawn, weekly', bio:'Reliable outdoor work.' },
      { id: 'p2', name: 'Milo Provider', role:'PROVIDER', rating:4.6, jobs:58, location:'Seattle, WA', hourlyRate:120, specialties:'photo, portrait', bio:'Natural light portraits.' },
    ]);
  }
  if (path === '/api/listings' && method === 'GET'){
    return res(200, [
      { id:'l1', title:'Lawn Care — quarter acre', description:'Mow, trim, and edge.', price:85, providerId:'p1', status:'LISTED', createdAt:now, tags:'home,outdoor,weekly,lawn,mow' },
      { id:'l2', title:'Portrait Session — 1 hour', description:'Natural light portraits.', price:220, providerId:'p2', status:'LISTED', createdAt:now, tags:'photo,creative,portrait,camera' },
    ]);
  }
  const provMatch = path.match(/^\/api\/providers\/(.+)$/);
  if (provMatch && method === 'GET'){
    const id = provMatch[1];
    const provider = id==='p1' ? { id:'p1', name:'Ava Provider', role:'PROVIDER', rating:4.8, jobs:124, location:'Austin, TX', hourlyRate:75, specialties:'lawn, weekly', bio:'Reliable outdoor work.', experienceYears:3, languages:'English', certifications:'Insured', website:'https://ava.example.com', phone:'+1 555-000-1111' } : { id:'p2', name:'Milo Provider', role:'PROVIDER', rating:4.6, jobs:58, location:'Seattle, WA', hourlyRate:120, specialties:'photo, portrait', bio:'Natural light portraits.', experienceYears:5, languages:'English, Spanish', certifications:'Certified', website:'https://milo.example.com', phone:'+1 555-222-3333', socialInstagram:'https://instagram.com/milo' };
    const listings = id==='p1' ? [{ id:'l1', title:'Lawn Care — quarter acre', description:'Mow, trim, and edge.', price:85, providerId:'p1', status:'LISTED', createdAt:now, tags:'home,outdoor,weekly,lawn,mow' }] : [{ id:'l2', title:'Portrait Session — 1 hour', description:'Natural light portraits.', price:220, providerId:'p2', status:'LISTED', createdAt:now, tags:'photo,creative,portrait,camera' }];
    return res(200, { provider, listings });
  }

  // Authed data
  if (path === '/api/user/favorites' && method === 'GET'){
    if (!token) return res(401, { error:'No token' });
    return res(200, []);
  }
  if (path === '/api/user/history' && method === 'GET'){
    if (!token) return res(401, { error:'No token' });
    return res(200, []);
  }
  if (path === '/api/trader/summary' && method === 'GET'){
    if (!token) return res(401, { error:'No token' });
    return res(200, { earnings: 0, orders: 0 });
  }
  if (path === '/api/trader/history' && method === 'GET'){
    if (!token) return res(401, { error:'No token' });
    return res(200, []);
  }
  if (path === '/api/trader/profile' && method === 'GET'){
    if (!token) return res(401, { error:'No token' });
    const u = getUser();
    const profile = (() => { try{ return JSON.parse(localStorage.getItem('tx_provider_profile')||'null') }catch{ return null } })() || {};
    return res(200, {
      id:'p-mock',
      name: u?.name || 'Provider',
      bio: profile.bio||'', location: profile.location||'', website: profile.website||'', phone: profile.phone||'', specialties: profile.specialties||'', hourlyRate: profile.hourlyRate||0, availability: profile.availability||'',
      experienceYears: profile.experienceYears||0, languages: profile.languages||'', certifications: profile.certifications||'', socialTwitter: profile.socialTwitter||'', socialInstagram: profile.socialInstagram||'', portfolio: profile.portfolio||'',
      sessionLength: profile.sessionLength||'60 min', editedPhotos: profile.editedPhotos||10, delivery: profile.delivery||'Online gallery', turnaround: profile.turnaround||'3–5 days', onLocation: ('onLocation' in profile ? profile.onLocation : true), studioAvailable: ('studioAvailable' in profile ? profile.studioAvailable : false), travelRadius: profile.travelRadius||'15 miles', styles: profile.styles||'natural light, candid, editorial', equipment: profile.equipment||'Full-frame body, 50mm, 85mm, reflector'
    });
  }
  if (path === '/api/trader/profile' && method === 'POST'){
    if (!token) return res(401, { error:'No token' });
    try{ localStorage.setItem('tx_provider_profile', opts.body || '{}') }catch{}
    return res(200, { ok:true });
  }
  if (path === '/api/checkout' && method === 'POST'){
    if (!token) return res(401, { error:'No token' });
    return res(200, { ok:true, txId: uid() });
  }

  return res(404, { error: 'Not found in mock', path, method });
}
