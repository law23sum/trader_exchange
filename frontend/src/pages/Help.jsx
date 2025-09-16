import React from 'react'

export default function Help(){
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-3">Help & FAQ</h1>
      <div className="space-y-5 text-gray-800">
        <div>
          <h2 className="font-semibold">How do I hire a provider?</h2>
          <p className="text-gray-700">Search or browse categories, open a provider page, choose a tier, confirm, and complete checkout. Your order is recorded and protected.</p>
        </div>
        <div>
          <h2 className="font-semibold">Is payment secure?</h2>
          <p className="text-gray-700">In this demo, payments are simulated. In production, we use an escrow-like flow so funds are released only after delivery.</p>
        </div>
        <div>
          <h2 className="font-semibold">What if there’s an issue?</h2>
          <p className="text-gray-700">You can contact the provider to resolve concerns. If unresolved, open a dispute and our team will review.</p>
        </div>
      </div>
    </main>
  )
}

