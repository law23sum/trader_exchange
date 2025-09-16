// Auto-fallback to mock API when backend is unreachable.
import { mockFetch, isMock } from './api.js'

// Enable mock by default in dev unless explicitly forced off
try{
  // VITE_FORCE_API=1 will force real backend; otherwise default to mock for a seamless experience
  // Users can disable mock manually via: localStorage.removeItem('tx_mock')
  const force = (import.meta?.env?.VITE_FORCE_API === '1')
  if (!force && localStorage.getItem('tx_mock') !== '1'){
    localStorage.setItem('tx_mock','1')
  }
}catch{}

const origFetch = window.fetch.bind(window)

function isApiUrl(input){
  try{
    // Normalize to absolute URL for checks
    const u = typeof input === 'string' ? new URL(input, window.location.origin) : new URL(input.url || input, window.location.origin)
    return u.pathname.startsWith('/api')
  }catch{ return false }
}

window.fetch = async function(input, init){
  if (!isApiUrl(input)){
    return origFetch(input, init)
  }
  // If mock already enabled, bypass network entirely
  if (isMock()){
    const path = typeof input === 'string' ? input : (input.url || '')
    const opts = { method:(init?.method||'GET'), headers:init?.headers||{}, body:init?.body }
    return await mockFetch(path, opts)
  }
  try{
    return await origFetch(input, init)
  }catch(e){
    try{ localStorage.setItem('tx_mock','1') }catch{}
    const path = typeof input === 'string' ? input : (input.url || '')
    // Build minimal opts for mockFetch
    const opts = {
      method: (init?.method || 'GET'),
      headers: init?.headers || {},
      body: init?.body,
    }
    return await mockFetch(path, opts)
  }
}
