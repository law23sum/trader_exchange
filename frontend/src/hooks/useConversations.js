import { fetchAuthed } from './useAuth.js'

function getCurrentUserId(){
  try{
    const user = JSON.parse(localStorage.getItem('tx_user') || 'null')
    return user?.id ? String(user.id) : ''
  }catch{
    return ''
  }
}

function buildTitle(providerName, providerId, userId){
  const namePart = providerName ? `Chat · ${providerName}` : 'Chat · Trader'
  const providerPart = providerId ? `[provider:${providerId}]` : ''
  const userPart = userId ? `[user:${userId}]` : ''
  return `${namePart} ${providerPart}${userPart}`.trim()
}

export async function ensureConversationWithProvider(providerId, providerName){
  const normalizedProvider = String(providerId || '').trim()
  const userId = getCurrentUserId()
  const hint = buildTitle(providerName, normalizedProvider, userId)

  let conversations = []
  try{
    const res = await fetchAuthed('/api/conversations')
    if (res.ok){
      conversations = await res.json()
    }
  }catch{}

  const existing = (conversations || []).find(c => {
    const title = String(c?.title || '')
    const hasProvider = normalizedProvider ? title.includes(`[provider:${normalizedProvider}]`) : true
    const hasUser = userId ? title.includes(`[user:${userId}]`) : true
    return hasProvider && hasUser
  })
  if (existing?.id) return existing.id

  try{
    const res = await fetchAuthed('/api/conversations', {
      method:'POST',
      body: JSON.stringify({ kind:'CHAT', title: hint, providerId })
    })
    if (res.ok){
      const data = await res.json().catch(()=>null)
      if (data?.id) return data.id
    }
  }catch{}
  return null
}
