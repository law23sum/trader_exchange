import React from 'react'
import { JourneyStepper } from '../components/JourneyStepper.jsx'

export default function HomeSearch({ onSearch, q, setQ }){
  return (
    <main className="tx-container">
      <section className="tx-section space-y-12 text-center">
        <JourneyStepper stage="discover" />
        <div className="mx-auto max-w-3xl space-y-6">
          <h1>Find the right trader in minutes.</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Search vetted providers, review listings, and move straight to checkout with a layout built for clarity.
          </p>
          <form
            onSubmit={onSearch}
            className="mx-auto flex w-full max-w-2xl flex-col items-stretch gap-3 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:flex-row"
          >
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search services or categories"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300/70"
            />
            <button className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 sm:w-auto">
              Search marketplace
            </button>
          </form>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Clear categories', body: 'Organized groupings and filters help you stay focused on what matters.' },
            { title: 'Real-time availability', body: 'Traders share availability upfront so you can plan without back-and-forth.' },
            { title: 'Protected checkout', body: 'Secure, streamlined confirmations keep every step easy on the eyes.' },
          ].map(feature => (
            <div key={feature.title} className="tx-card p-5 text-left">
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
