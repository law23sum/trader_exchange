const PROFILES_KEY = 'tx_customer_profiles'
const LEGACY_KEY = 'tx_customer'

function parseJSON(value, fallback = null){
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function getStoredUser(){
  return parseJSON(localStorage.getItem('tx_user'), null)
}

function profileKeyFor(user){
  if (!user || typeof user !== 'object') return null
  if (user.id) return `id:${user.id}`
  if (user.email) return `email:${String(user.email).toLowerCase()}`
  return null
}

function readProfiles(){
  const raw = localStorage.getItem(PROFILES_KEY)
  const parsed = parseJSON(raw, {})
  return parsed && typeof parsed === 'object' ? parsed : {}
}

function writeProfiles(profiles){
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles || {}))
  } catch {}
}

export function getCustomerProfile(user){
  const activeUser = user || getStoredUser()
  const key = profileKeyFor(activeUser)
  const profiles = readProfiles()
  if (key && profiles[key]){
    return profiles[key]
  }

  // Legacy fallback
  const legacy = parseJSON(localStorage.getItem(LEGACY_KEY), null)
  if (!legacy) return null

  if (key){
    profiles[key] = legacy
    writeProfiles(profiles)
    try { localStorage.removeItem(LEGACY_KEY) } catch {}
  }
  return legacy
}

export function setCustomerProfile(profile, user){
  const activeUser = user || getStoredUser()
  const key = profileKeyFor(activeUser)
  if (!key){
    try { localStorage.setItem(LEGACY_KEY, JSON.stringify(profile || {})) } catch {}
    return
  }
  const profiles = readProfiles()
  profiles[key] = profile || {}
  writeProfiles(profiles)
}

export function clearCustomerProfile(user){
  const activeUser = user || getStoredUser()
  const key = profileKeyFor(activeUser)
  if (!key){
    try { localStorage.removeItem(LEGACY_KEY) } catch {}
    return
  }
  const profiles = readProfiles()
  if (profiles[key]){
    delete profiles[key]
    writeProfiles(profiles)
  }
}

export const CUSTOMER_PROFILES_KEY = PROFILES_KEY
export const LEGACY_CUSTOMER_KEY = LEGACY_KEY
