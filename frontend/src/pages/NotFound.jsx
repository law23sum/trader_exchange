import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound(){
  return (
    <main className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-6xl">🧭</div>
      <h1 className="text-2xl font-semibold mt-2">Page not found</h1>
      <p className="text-gray-600 mt-2">The page you’re looking for doesn’t exist.</p>
      <div className="mt-4">
        <Link to="/" className="inline-block px-3 py-2 rounded-xl border bg-white hover:bg-gray-50">Go home</Link>
      </div>
    </main>
  )
}

