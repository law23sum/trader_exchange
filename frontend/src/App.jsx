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
import CustomerHome from './pages/CustomerHome.jsx'
import TraderHome from './pages/TraderHome.jsx'
import AdminHome from './pages/AdminHome.jsx'
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
import CustomerDetails from './pages/CustomerDetails.jsx'
import StripeSuccess from './pages/StripeSuccess.jsx'
import { Input, Button } from './components/ui.js'
import { fetchAuthed, setToken } from './hooks/useAuth.js'

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

function HomeEntry({ me, loading, q, setQ, onSearch }){
  if (loading) return <div className="p-6 text-sm text-gray-600">Loading your workspace…</div>
  if (!me) return <HomeSearch onSearch={onSearch} q={q} setQ={setQ} />
  if (isAdmin(me)) return <AdminHome me={me} />
  if (isTrader(me)) return <TraderHome me={me} />
  return <CustomerHome me={me} />
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
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/75 backdrop-blur">
        <div className="tx-container flex items-center justify-between py-4">
          <button type="button" className="flex items-center gap-3" onClick={() => navigate('/')}
            aria-label="Go to home">
            <div className="grid size-10 place-items-center rounded-2xl bg-gray-900 text-base font-semibold uppercase tracking-wide text-white">TX</div>
            <div className="text-left">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-600">Trade Exchange</div>
              <div className="text-sm font-medium text-gray-900">Service · Players · Actions · Events</div>
            </div>
          </button>
          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm font-medium text-gray-700">
            {!me && (
              <>
                <Link to="/how-it-works" className="rounded-lg px-3 py-2 hover:bg-gray-100">How it works</Link>
                <Link to="/pricing" className="rounded-lg px-3 py-2 hover:bg-gray-100">Pricing</Link>
                <Link to="/become-a-provider" className="rounded-lg px-3 py-2 text-gray-900 hover:bg-gray-100">Become a provider</Link>
              </>
            )}
            {me && <Link to="/" className="rounded-lg px-3 py-2 text-gray-900 hover:bg-gray-100">Home</Link>}
            <Link to="/messages" className="rounded-lg px-3 py-2 hover:bg-gray-100">Messages</Link>
            <Link to="/customer-details" className="rounded-lg px-3 py-2 hover:bg-gray-100">Customer details</Link>
            {!me && (
              <>
                <Link to="/signin" className="rounded-lg px-3 py-2 text-gray-900 hover:bg-gray-100">Sign in</Link>
                <Link to="/signup" className="rounded-lg px-3 py-2 text-gray-900 hover:bg-gray-100">Sign up</Link>
              </>
            )}
            {me && (
              <>
                <Link to={dashboardPath} className="rounded-lg px-3 py-2 text-gray-900 hover:bg-gray-100">{admin ? 'Status board' : 'Status'}</Link>
                <Button variant="ghost" onClick={signOut}>Sign out</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomeEntry me={me} loading={loadingMe} q={q} setQ={setQ} onSearch={onSubmit} />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/provider/:id" element={<TraderDetailsPage />} />
        <Route path="/confirm/:listingId/:providerId/:price" element={<ConfirmationPage />} />
        <Route path="/checkout/:listingId/:providerId/:price" element={<CheckoutPage />} />
        <Route path="/customer-details" element={<CustomerDetails />} />
        <Route path="/payment/success" element={<StripeSuccess />} />

        <Route path="/signin" element={me ? <Navigate replace to="/" /> : <SignIn onAuthed={loadMe} />} />
        <Route path="/signup" element={me ? <Navigate replace to="/" /> : <SignUp onAuthed={loadMe} />} />
        <Route path="/dashboard/user" element={<UserOnly me={me} loading={loadingMe}><UserDashboard /></UserOnly>} />
        <Route path="/dashboard/trader" element={<TraderOnly me={me} loading={loadingMe}><TraderDashboard /></TraderOnly>} />
        <Route path="/admin" element={<AdminOnly me={me} loading={loadingMe}><AdminDashboard /></AdminOnly>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/messages" element={<MessagesList />} />
        <Route path="/messages/:id" element={<ConversationPage />} />

        <Route path="/about" element={<About />} />
        <Route path="/become-a-provider" element={me && (admin || trader || me?.providerPlayerId) ? <Navigate replace to="/" /> : <BecomeProvider />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <footer className="mt-16 border-t border-gray-200 bg-white/80">
        <div className="tx-container grid gap-10 py-12 text-sm text-gray-600 sm:grid-cols-3">
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Trade Exchange</div>
            <p className="text-sm text-gray-700">Service · Players · Actions · Events</p>
            <p className="text-xs text-gray-500">Connecting players with trusted providers worldwide.</p>
          </div>
          <nav className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Company</div>
            <Link to="/about" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">About</Link>
            <Link to="/how-it-works" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">How it works</Link>
            <Link to="/pricing" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">Pricing</Link>
            <Link to="/become-a-provider" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">Become a provider</Link>
            <Link to="/contact" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">Contact</Link>
          </nav>
          <nav className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Support & Legal</div>
            <Link to="/help" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">Help / FAQ</Link>
            <Link to="/safety" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">Trust & safety</Link>
            <Link to="/terms" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">Terms</Link>
            <Link to="/privacy" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100">Privacy</Link>
          </nav>
        </div>
        <div className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">© {new Date().getFullYear()} Trade Exchange. All rights reserved.</div>
      </footer>
    </div>
  )
}
