import React from 'react'

const STEPS = [
  { key: 'discover', label: 'Discover', description: 'Search and compare vetted traders.' },
  { key: 'consult', label: 'Consult', description: 'Message or schedule an intro call.' },
  { key: 'book', label: 'Book', description: 'Pick a service, date, and secure payment.' },
  { key: 'service', label: 'Service', description: 'Trader completes the scheduled job.' },
  { key: 'review', label: 'Review', description: 'Share feedback to evolve the marketplace.' },
]

function resolveStage(current){
  if (!current) return 'discover'
  const match = STEPS.find(step => step.key === current)
  return match ? match.key : 'discover'
}

export function JourneyStepper({ stage }){
  const activeKey = resolveStage(stage)
  const activeIndex = STEPS.findIndex(step => step.key === activeKey)

  return (
    <div className="tx-card border-none bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Customer journey</div>
          <div className="text-lg font-semibold text-gray-900">Stay on track from discovery to review</div>
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => {
              const isActive = index === activeIndex
              const isComplete = index < activeIndex
              return (
                <li key={step.key} className={`rounded-2xl border px-4 py-3 ${isActive ? 'border-gray-900 bg-gray-900 text-white' : isComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide">{index + 1}. {step.label}</div>
                  <p className={`mt-1 text-xs leading-relaxed ${isActive ? 'text-white/90' : isComplete ? 'text-emerald-700/80' : 'text-gray-500'}`}>{step.description}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
