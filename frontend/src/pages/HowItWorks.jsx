import React from 'react'

export default function HowItWorks(){
  const steps = [
    { title:'1. Search', text:'Find the right provider by keyword or category.' },
    { title:'2. Review', text:'Compare listings, read bios, and pick a tier.' },
    { title:'3. Checkout', text:'Confirm scope and pay securely with protection.' },
    { title:'4. Deliver', text:'Message, deliver work, and track progress.' },
  ]
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-6">How it works</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {steps.map(s => (
          <div key={s.title} className="border rounded-2xl p-5">
            <div className="text-lg font-semibold">{s.title}</div>
            <div className="text-gray-700 mt-1">{s.text}</div>
          </div>
        ))}
      </div>
    </main>
  )
}

