import React, { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, Link, Navigate } from 'react-router-dom'
import HomeSearch from './pages/HomeSearch.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import TraderDetailsPage from './pages/TraderDetailsPage.jsx'
import ConfirmationPage from './pages/ConfirmationPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import TraderDashboard from './pages/TraderDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import About from './pages/About.jsx'

// Robust trader detection to handle different backends
function isTrader(u){
  if (!u) return false
  if (u.role && String(u.role).toUpperCase() === 'TRADER') return true
  if (Array.isArray(u.roles) && u.roles.map(r=>String(r).toUpperCase()).includes('TRADER')) return true
  if (u.isTrader === true || u.isProvider === true) return true
  if (u.providerId || u.providerPlayerId || u.provider || u.traderId) return true
  if (typeof u.email === 'string' && u.email.toLowerCase().includes('trader')) return true
  return false
}

function isAdmin(u){
  if (!u) return false
  return String(u.role || '').toUpperCase() === 'ADMIN'
}

import Contact from './pages/Contact.jsx'
import Help from './pages/Help.jsx'
import Pricing from './pages/Pricing.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Safety from './pages/Safety.jsx'
import Terms from './pages/Terms.jsx'
import Privacy from './pages/Privacy.jsx'
import NotFound from './pages/NotFound.jsx'
import MessagesList from './pages/MessagesList.jsx'
import ConversationPage from './pages/ConversationPage.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import BecomeProvider from './pages/BecomeProvider.jsx'
import { Input, Button } from './components/ui.js'
import { fetchAuthed, setToken } from './hooks/useAuth.js'

function DashboardRedirect({ me }){
  // Fallback: try local cache if me not loaded yet
  try {
    const cached = JSON.parse(localStorage.getItem('tx_user')||'null')
    if (!me && cached) me = cached
  } catch {}
  if (!me) return <div className="p-4 text-sm text-gray-600">Loading…</div>
  if (isAdmin(me)) return <Navigate to="/admin" replace />
  const goTrader = isTrader(me)
  return <Navigate to={goTrader ? '/dashboard/trader' : '/dashboard/user'} replace />
}

function TraderOnly({ me, loading, children }){
  if (loading) return <div className="p-4 text-sm text-gray-600">Loading…</div>
  if (!me) return <Navigate to="/signin" replace />
  if (isAdmin(me)) return <Navigate to="/admin" replace />
  return isTrader(me) ? children : <Navigate to="/dashboard/user" replace />
}
function UserOnly({ me, loading, children }){
  if (loading) return <div className="p-4 text-sm text-gray-600">Loading…</div>
  if (!me) return <Navigate to="/signin" replace />
  if (isAdmin(me)) return <Navigate to="/admin" replace />
  return !isTrader(me) ? children : <Navigate to="/dashboard/trader" replace />
}

function AdminOnly({ me, loading, children }){
  if (loading) return <div className="p-4 text-sm text-gray-600">Loading…</div>
  if (!me) return <Navigate to="/signin" replace />
  return isAdmin(me) ? children : <Navigate to={isTrader(me) ? '/dashboard/trader' : '/dashboard/user'} replace />
}


export default function App(){
  const [q, setQ] = useState('')
  const [me, setMe] = useState(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const navigate = useNavigate()

  const admin = isAdmin(me)
  const trader = isTrader(me)
  const dashboardPath = admin ? '/admin' : (trader ? '/dashboard/trader' : '/dashboard/user')

  const onSubmit = (e) => { e?.preventDefault?.(); navigate(`/results?q=${encodeURIComponent(q)}`) }

  async function loadMe(){
    try{
      const res = await fetchAuthed('/api/me')
      if (res.ok) setMe(await res.json()); else setMe(null)
    }catch{ setMe(null) }
    finally { setLoadingMe(false) }
  }
  useEffect(() => { loadMe() }, [])

  const signOut = async () => {
    try{ await fetchAuthed('/api/signout', { method:'POST' }) }catch{}
    setToken(''); setMe(null); navigate('/')
  }

  // Render the shell immediately; auth loads in background.

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="size-8 rounded-xl bg-black text-white grid place-items-center font-bold">TX</div>
            <div><div className="font-semibold">Trade Exchange</div>
              <div className="text-xs text-gray-500">Service · Players · Actions · Events</div></div>
          </div>
          {/* Search moved into dedicated pages (Home & Results) for better layout */}
          <div className="flex items-center gap-2">
            {/* Hide marketing links after login */}
            {!me && (
              <>
                <Link to="/how-it-works" className="text-sm text-gray-700 hover:underline">How it works</Link>
                <Link to="/pricing" className="text-sm text-gray-700 hover:underline">Pricing</Link>
                <Link to="/become-a-provider" className="text-sm underline">Become a provider</Link>
              </>
            )}
            <Link to="/messages" className="text-sm text-gray-700 hover:underline">Messages</Link>
            {!me && (
              <>
                <Link to="/signin" className="text-sm underline">Sign in</Link>
                <Link to="/signup" className="text-sm underline">Sign up</Link>
              </>
            )}
            {me && (
              <>
                <Link to={dashboardPath} className="text-sm underline">{admin ? 'Admin' : 'Dashboard'}</Link>
                <Button variant="ghost" onClick={signOut}>Sign out</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={me ? <Navigate replace to={dashboardPath} /> : <HomeSearch onSearch={onSubmit} q={q} setQ={setQ} />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/provider/:id" element={<TraderDetailsPage />} />
        <Route path="/confirm/:listingId/:providerId/:price" element={<ConfirmationPage />} />
        <Route path="/checkout/:listingId/:providerId/:price" element={<CheckoutPage />} />

        <Route path="/signin" element={me ? <Navigate replace to={dashboardPath} /> : <SignIn onAuthed={loadMe} />} />
        <Route path="/signup" element={me ? <Navigate replace to={dashboardPath} /> : <SignUp onAuthed={loadMe} />} />
        <Route path="/dashboard/user" element={<UserOnly me={me} loading={loadingMe}><UserDashboard /></UserOnly>} />
        <Route path="/dashboard/trader" element={<TraderOnly me={me} loading={loadingMe}><TraderDashboard /></TraderOnly>} />
        <Route path="/admin" element={<AdminOnly me={me} loading={loadingMe}><AdminDashboard /></AdminOnly>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/messages" element={<MessagesList />} />
        <Route path="/messages/:id" element={<ConversationPage />} />

        <Route path="/about" element={<About />} />
        <Route path="/become-a-provider" element={me && (admin || trader || me?.providerPlayerId) ? <Navigate replace to={dashboardPath} /> : <BecomeProvider />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <footer className="border-t mt-10">
        <div className="max-w-6xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="font-semibold mb-2">Trade Exchange</div>
            <div className="text-gray-600">Service · Players · Actions · Events</div>
          </div>
          <nav className="space-y-1 text-gray-700">
            <div className="font-medium">Company</div>
            <Link to="/about" className="block hover:underline">About</Link>
            <Link to="/how-it-works" className="block hover:underline">How it works</Link>
            <Link to="/pricing" className="block hover:underline">Pricing</Link>
            <Link to="/become-a-provider" className="block hover:underline">Become a provider</Link>
            <Link to="/contact" className="block hover:underline">Contact</Link>
          </nav>
          <nav className="space-y-1 text-gray-700">
            <div className="font-medium">Support & Legal</div>
            <Link to="/help" className="block hover:underline">Help / FAQ</Link>
            <Link to="/safety" className="block hover:underline">Trust & safety</Link>
            <Link to="/terms" className="block hover:underline">Terms</Link>
            <Link to="/privacy" className="block hover:underline">Privacy</Link>
          </nav>
        </div>
        <div className="text-xs text-gray-500 text-center pb-8">© {new Date().getFullYear()} Trade Exchange</div>
      </footer>
    </div>
  )
}
