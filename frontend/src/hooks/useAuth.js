import { isMock, mockFetch } from '../mock/api.js'
export function getToken(){ return localStorage.getItem('tx_token') || ''; }
export function setToken(t){ t ? localStorage.setItem('tx_token', t) : localStorage.removeItem('tx_token'); }
function apiBase(){ return import.meta.env.VITE_API_BASE || ''; }
export async function fetchAuthed(path, opts={}){
  const token = getToken();
  const headers = { 'Content-Type':'application/json', ...(opts.headers||{}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 8000);
  try{
    const res = isMock() ? await mockFetch(path, { ...opts, headers }) : await fetch(`${apiBase()}${path}`, { ...opts, headers, signal: ctrl.signal });
    if (res.status === 401) { setToken(''); }
    return res;
  } finally {
    clearTimeout(t);
  }
}
