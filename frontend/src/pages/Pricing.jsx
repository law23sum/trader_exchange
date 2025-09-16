import React from 'react'

export default function Pricing(){
  const tiers = [
    { name:'Basic', price:'Free', features:['Browse providers','Contact support','No posting'] },
    { name:'Standard', price:'$9/mo', features:['Favorites & history','Priority support','Provider messaging'] },
    { name:'Pro', price:'$29/mo', features:['For providers','Advanced analytics','Priority placement'] },
  ]
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-6">Pricing</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {tiers.map(t => (
          <div key={t.name} className="border rounded-2xl p-5">
            <div className="text-xl font-semibold">{t.name}</div>
            <div className="text-2xl font-bold mt-1">{t.price}</div>
            <ul className="text-sm text-gray-700 mt-3 list-disc ml-5 space-y-1">
              {t.features.map(f => <li key={f}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">Pricing shown for demo. Actual billing depends on your region and plan.</p>
    </main>
  )
}

