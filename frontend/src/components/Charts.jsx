import React from 'react'

export function MiniSparkline({ values = [], stroke = '#111', height = 40, width = 120 }){
  if (!values || values.length === 0) values = [0]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1e-6, max - min)
  const stepX = width / Math.max(1, values.length - 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / span) * height
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  )
}

