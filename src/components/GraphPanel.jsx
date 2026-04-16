import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

const CHART_STYLE = {
  backgroundColor: '#0d1117',
  borderRadius: '24px',
  padding: '16px',
}

const AXIS_STYLE = {
  tick: { fill: '#8b949e', fontSize: 11 },
  axisLine: { stroke: '#30363d' },
  tickLine: { stroke: '#30363d' },
}

const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: '#21262d',
}

const API_URL = '/api/claude'

function getLocalAnalysis(simulationType, dataStream, variables) {
  const analysis = {
    inclined_plane: {
      principle: "Objects on inclined planes accelerate due to the component of gravity parallel to the surface (g·sin(θ)), while friction opposes motion.",
      insight: "Despite different masses, objects on a frictionless incline accelerate at the same rate—the mass cancels out in the equation a = g·sin(θ).",
      application: "Roller coasters, wheelchair ramps, and conveyor belts all use inclined plane physics to control acceleration rates.",
      experiment: "Try varying the angle θ and observe how acceleration changes. Verify that acceleration ∝ sin(θ)."
    },
    projectile: {
      principle: "Projectile motion splits into independent horizontal (constant velocity) and vertical (constant acceleration g) components.",
      insight: "A bullet fired horizontally hits the ground at the same time as one dropped from the same height—gravity acts equally regardless of horizontal motion.",
      application: "Sports like basketball, golf, and javelin rely on optimizing launch angle and velocity for maximum range.",
      experiment: "Launch at different angles (30°, 45°, 60°) and measure ranges. Confirm that 45° gives maximum range on level ground."
    },
    pendulum: {
      principle: "For small angles, pendulum period T = 2π√(L/g) depends only on length and gravity—not mass or amplitude.",
      insight: "A grandfather clock keeps time the same whether it has a light or heavy bob, because mass cancels out of the period equation.",
      application: "Pendulum clocks, seismometers, and metronomes all rely on the period-independence from mass.",
      experiment: "Change the pendulum length and measure period. Verify T² ∝ L (quadratic relationship with length)."
    },
    circular_motion: {
      principle: "Uniform circular motion requires a centripetal force F = mv²/r directed toward the center, keeping the object in curved path.",
      insight: "There is no 'centrifugal force' acting outward—objects appear to fly off only when the centripetal constraint is removed.",
      application: "Car tires navigating curves, planets orbiting stars, and electrons in magnetic fields all require centripetal forces.",
      experiment: "Cut the string and observe the ball fly off tangentially, confirming that without centripetal force, motion is linear."
    },
    spring: {
      principle: "Hooke's Law (F = -kx) describes ideal springs, where force is proportional to displacement from equilibrium.",
      insight: "The system exhibits Simple Harmonic Motion with period T = 2π√(m/k)—independent of amplitude.",
      application: "Car suspensions, bouncy balls, and spring scales all utilize Hooke's Law.",
      experiment: "Add mass and measure period. Verify T ∝ √m and T ∝ 1/√k (stiffer spring = faster oscillation)."
    },
    collision: {
      principle: "Momentum (p = mv) is always conserved in collisions, while kinetic energy may be conserved (elastic) or lost (inelastic).",
      insight: "In a perfectly inelastic collision, maximum kinetic energy is lost, but total momentum is still conserved.",
      application: "Car crumple zones, ball-catching, and particle physics detectors all rely on collision physics.",
      experiment: "Let balls collide elastically vs inelastically. Measure velocities before and after to verify momentum conservation."
    },
    wave: {
      principle: "Wave speed v = λf relates wavelength and frequency—changing one proportionally changes the other.",
      insight: "Wave speed in a medium is fixed; only wavelength and frequency adjust. A higher frequency means shorter wavelength.",
      application: "Musical instruments, radio transmission, and fiber optic cables all use wave relationships.",
      experiment: "Vary frequency and observe wavelength change. Verify that v = λf remains constant."
    },
    orbital: {
      principle: "Orbital mechanics follow F = GMm/r² for gravitational attraction, creating stable elliptical orbits.",
      insight: "A spacecraft speeds up at periapsis (closest point) and slows down at apoapsis—orbital energy is constant.",
      application: "Satellite placement, space station docking, and gravitational slingshots all use orbital mechanics.",
      experiment: "Adjust initial velocity and observe orbit shape: circular, elliptical, parabolic, or hyperbolic."
    }
  }
  
  return analysis[simulationType] || {
    principle: "This simulation demonstrates fundamental physics principles through interactive visualization.",
    insight: "Real-world physics often differs slightly from idealized models due to factors like air resistance and measurement uncertainty.",
    application: "The principles shown apply across engineering, from bridges to spacecraft.",
    experiment: "Try changing multiple variables to see how the system responds."
  }
}

function generateLocalQuiz(simulationType, dataStream, variables) {
  const quizzes = {
    inclined_plane: {
      question: `Given the current simulation, what happens to acceleration when the incline angle increases?`,
      options: [
        "Acceleration decreases",
        "Acceleration increases",
        "Acceleration stays the same",
        "Acceleration becomes negative"
      ],
      correctIndex: 1,
      explanation: "Acceleration = g·sin(θ). As θ increases, sin(θ) increases, so acceleration increases."
    },
    projectile: {
      question: `At what angle does a projectile achieve maximum range on level ground?`,
      options: ["30°", "45°", "60°", "90°"],
      correctIndex: 1,
      explanation: "45° provides optimal balance between horizontal velocity and time of flight for maximum range."
    },
    pendulum: {
      question: `What happens to the pendulum period when you double the length?`,
      options: [
        "Period doubles",
        "Period quadruples",
        "Period increases by √2",
        "Period stays the same"
      ],
      correctIndex: 2,
      explanation: "T = 2π√(L/g). If L doubles, √L increases by √2, so period increases by √2."
    },
    circular_motion: {
      question: `What happens when the centripetal force is suddenly removed during circular motion?`,
      options: [
        "Object stops immediately",
        "Object flies off tangentially",
        "Object continues in circle",
        "Object falls downward"
      ],
      correctIndex: 1,
      explanation: "Without centripetal force, the object maintains its velocity vector and flies off in a straight line (tangent to the circle)."
    }
  }
  
  return quizzes[simulationType] || {
    question: `Based on the simulation data, what can you observe about the system's behavior?`,
    options: [
      "The system is oscillating",
      "The system is in equilibrium",
      "The system is accelerating",
      "The system is at rest"
    ],
    correctIndex: 0,
    explanation: "The simulation demonstrates dynamic behavior that can be analyzed from the graphs."
  }
}

async function callClaudeAPI(prompt, systemPrompt) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: systemPrompt + '\n\n' + prompt,
        max_tokens: 500,
      }),
    })
    if (!response.ok) throw new Error('API request failed')
    const data = await response.json()
    return data.completion || data.response || data.content
  } catch (error) {
    console.warn('Claude API unavailable, using local analysis:', error)
    return null
  }
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#0d1117]/95 px-3 py-2 shadow-lg">
        <p className="font-mono-display text-xs text-slate-400">t = {label?.toFixed(2)}s</p>
        {payload.map((entry, index) => (
          <p key={index} className="font-mono-display text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(3)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function AnomalyHighlight({ anomalousData }) {
  if (!anomalousData || anomalousData.length === 0) return null
  
  return (
    <ReferenceArea
      x1={anomalousData[0]?.t}
      x2={anomalousData[anomalousData.length - 1]?.t}
      fill="#ff0000"
      fillOpacity={0.2}
      stroke="#ff0000"
      strokeOpacity={0.5}
    />
  )
}

function EnergyConservationAlert({ drift, threshold = 0.05 }) {
  if (drift <= threshold) return null
  
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2">
      <span className="text-lg">⚠️</span>
      <p className="font-mono-display text-xs text-red-400">
        Energy not conserved — drift of {(drift * 100).toFixed(1)}% detected. Check damping settings.
      </p>
    </div>
  )
}

function PhysicsTutorPanel({ analysis, loading }) {
  const cards = [
    {
      icon: '⚡',
      title: 'Physics Principle',
      color: '#00f5ff',
      content: analysis?.principle || 'Analyzing...',
    },
    {
      icon: '💡',
      title: 'Key Insight',
      color: '#ff8800',
      content: analysis?.insight || 'Analyzing...',
    },
    {
      icon: '🌍',
      title: 'Real-World Application',
      color: '#88ff88',
      content: analysis?.application || 'Analyzing...',
    },
    {
      icon: '🔬',
      title: 'Follow-up Experiment',
      color: '#ff88ff',
      content: analysis?.experiment || 'Analyzing...',
    },
  ]

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
          <span className="text-xl">🤖</span>
        </div>
        <div>
          <p className="font-mono-display text-sm uppercase tracking-wider text-white">Physics Tutor</p>
          <p className="font-mono-display text-xs text-slate-400">AI-powered analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">{card.icon}</span>
              <p className="font-mono-display text-xs uppercase tracking-wider" style={{ color: card.color }}>
                {card.title}
              </p>
            </div>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-300">
                {card.content}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function QuizModal({ quiz, onClose, onAnswer }) {
  if (!quiz) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-w-lg rounded-2xl border border-white/20 bg-gradient-to-b from-[#1a1a2e] to-[#0d1117] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono-display text-lg uppercase tracking-wider text-white">
            🧠 Quiz Time!
          </h3>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white">×</button>
        </div>
        
        <p className="mb-6 text-sm text-slate-300">{quiz.question}</p>
        
        <div className="space-y-2">
          {quiz.options?.map((option, i) => (
            <button
              key={i}
              onClick={() => onAnswer(i, quiz.correctIndex)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-left font-mono-display text-sm text-slate-300 transition-all hover:border-white/40 hover:bg-white/10"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CompareLegend({ datasets }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-4">
      {datasets.map((ds, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-3 w-6 rounded" style={{ backgroundColor: ds.color }} />
          <span className="font-mono-display text-xs text-slate-400">{ds.name}</span>
        </div>
      ))}
    </div>
  )
}

function exportToCSV(dataStream, filename = 'simulation_data.csv') {
  if (!dataStream || dataStream.length === 0) return
  
  const headers = Object.keys(dataStream[0])
  const csvContent = [
    headers.join(','),
    ...dataStream.map(row => 
      headers.map(h => {
        const val = row[h]
        return typeof val === 'string' ? `"${val}"` : (val ?? '')
      }).join(',')
    )
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function KeyInsightBox({ insight, loading }) {
  return (
    <div
      style={CHART_STYLE}
      className="mt-4 border border-[rgba(0,245,255,0.2)] bg-[linear-gradient(180deg,rgba(0,245,255,0.06),rgba(0,245,255,0.02))]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)]">
          <svg className="h-4 w-4 text-[#00f5ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">Key Insight</p>
      </div>
      <div className="mt-3 min-h-[48px] rounded-xl border border-white/5 bg-[#0d1117]/60 p-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00f5ff] border-t-transparent" />
            <p className="text-sm text-slate-400">Analyzing simulation data...</p>
          </div>
        ) : insight ? (
          <p className="text-sm leading-relaxed text-slate-200">{insight}</p>
        ) : (
          <p className="text-sm text-slate-500">Run the simulation to see physics insights...</p>
        )}
      </div>
    </div>
  )
}

function BaseCharts({ dataStream, currentTime, anomalousData }) {
  const [primaryKey, secondaryKey] = useMemo(() => {
    if (!dataStream || dataStream.length === 0) return ['velocity', 'acceleration']
    const keys = Object.keys(dataStream[0]).filter(k => k !== 't')
    return [keys[0] || 'value', keys[1] || 'value2']
  }, [dataStream])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
          Primary vs Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            {anomalousData && <AnomalyHighlight anomalousData={anomalousData} />}
            <Line type="monotone" dataKey={primaryKey} name={primaryKey} stroke="#00f5ff" strokeWidth={2} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#ff8800]">
          Secondary vs Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey={secondaryKey} name={secondaryKey} stroke="#ff8800" strokeWidth={2} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CompareCharts({ datasets, currentTime }) {
  const colors = ['#00f5ff', '#ff8800', '#88ff88', '#ff88ff', '#ffff00']
  
  return (
    <div style={CHART_STYLE} className="border border-white/10">
      <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
        Comparison View
      </p>
      <CompareLegend datasets={datasets} />
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={datasets[0]?.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} />
          <Tooltip content={<CustomTooltip />} />
          {datasets.map((ds, i) => (
            <Line key={i} type="monotone" dataKey="value" name={ds.name} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
          {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
        </LineChart>
      </ResponsiveContainer>
      
      {datasets.length > 1 && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="mb-2 font-mono-display text-xs uppercase tracking-wider text-slate-400">Delta Analysis</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {datasets[0]?.data && datasets[1]?.data && (() => {
              const latest0 = datasets[0].data[datasets[0].data.length - 1]
              const latest1 = datasets[1].data[datasets[1].data.length - 1]
              const delta = latest0?.value - latest1?.value
              return (
                <>
                  <div className="text-slate-400">Final value diff:</div>
                  <div className="text-white">{delta?.toFixed(3)}</div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

function InclinedPlaneCharts({ dataStream, currentTime, anomalousData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">Velocity vs Time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis label={{ value: 'Velocity (m/s)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            {anomalousData && <AnomalyHighlight anomalousData={anomalousData} />}
            <Line type="monotone" dataKey="velocity" name="Velocity" stroke="#00f5ff" strokeWidth={2} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#ff8800]">Acceleration vs Time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis label={{ value: 'Acceleration (m/s²)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="acceleration" name="Acceleration" stroke="#ff8800" strokeWidth={2} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ProjectileCharts({ dataStream, currentTime, anomalousData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">Height vs Time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis label={{ value: 'Height (m)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} domain={[0, 'auto']} {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            {anomalousData && <AnomalyHighlight anomalousData={anomalousData} />}
            <Line type="monotone" dataKey="height" name="Height" stroke="#00f5ff" strokeWidth={2} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#ff8800]">Distance vs Time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis label={{ value: 'Distance (m)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} domain={[0, 'auto']} {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="distance" name="Distance" stroke="#ff8800" strokeWidth={2} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PendulumCharts({ dataStream, currentTime, anomalousData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">Angle vs Time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis label={{ value: 'Angle (rad)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} domain={[-1.5, 1.5]} {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            {anomalousData && <AnomalyHighlight anomalousData={anomalousData} />}
            <Line type="monotone" dataKey="angle" name="Angle" stroke="#00f5ff" strokeWidth={2} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#ff8800]">Angular Velocity vs Time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis label={{ value: 'Angular Vel (rad/s)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="velocity" name="Velocity" stroke="#ff8800" strokeWidth={2} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function EnergyCharts({ dataStream, currentTime, anomalousData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00ff88]">Total Energy vs Time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis label={{ value: 'Energy (J)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            {anomalousData && <AnomalyHighlight anomalousData={anomalousData} />}
            <Line type="monotone" dataKey="totalEnergy" name="Total Energy" stroke="#00ff88" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="KE" name="Kinetic" stroke="#ff8800" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="PE" name="Potential" stroke="#4488ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            {currentTime > 0 && <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#ff88ff]">Phase Space</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="angle" type="number" label={{ value: 'Position', position: 'bottom', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <YAxis dataKey="velocity" type="number" label={{ value: 'Velocity', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} {...AXIS_STYLE} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="angle" name="Position" stroke="#ff88ff" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function detectEnergyAnomalies(dataStream) {
  if (!dataStream || dataStream.length < 10) return { anomalousData: [], drift: 0 }
  
  const energyValues = dataStream.filter(d => d.totalEnergy !== undefined).map(d => d.totalEnergy)
  if (energyValues.length < 2) return { anomalousData: [], drift: 0 }
  
  const initialEnergy = energyValues[0]
  const maxEnergy = Math.max(...energyValues)
  const minEnergy = Math.min(...energyValues)
  const drift = Math.abs(maxEnergy - minEnergy) / Math.abs(initialEnergy)
  
  if (drift > 0.05) {
    const anomalousIndices = []
    let inAnomaly = false
    let startIndex = 0
    
    energyValues.forEach((E, i) => {
      const localDrift = Math.abs(E - initialEnergy) / Math.abs(initialEnergy)
      if (localDrift > 0.05 && !inAnomaly) {
        inAnomaly = true
        startIndex = i
      } else if (localDrift <= 0.02 && inAnomaly) {
        inAnomaly = false
        anomalousIndices.push({ start: startIndex, end: i })
      }
    })
    
    const anomalousData = anomalousIndices.flatMap(({ start, end }) => 
      dataStream.slice(start, end).map(d => ({ t: d.t }))
    )
    
    return { anomalousData, drift }
  }
  
  return { anomalousData: [], drift }
}

export default function GraphPanel({
  simulationType = 'inclined_plane',
  dataStream = [],
  variables = {},
  compareData = null,
  onQuizAnswer = null,
}) {
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const analysisTimeoutRef = useRef(null)
  
  const currentTime = useMemo(() => {
    if (dataStream.length > 0) return dataStream[dataStream.length - 1].t || 0
    return 0
  }, [dataStream])
  
  const { anomalousData, drift } = useMemo(() => {
    const conservativeTypes = ['pendulum', 'circular_motion', 'projectile']
    if (!conservativeTypes.includes(simulationType)) {
      return { anomalousData: [], drift: 0 }
    }
    return detectEnergyAnomalies(dataStream)
  }, [simulationType, dataStream])
  
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current)
    }
    
    if (dataStream.length > 50 || currentTime > 5) {
      analysisTimeoutRef.current = setTimeout(async () => {
        setAnalysisLoading(true)
        
        const prompt = `You are a physics tutor. Given this simulation data for a ${simulationType} simulation with variables ${JSON.stringify(variables)}:
        
Data samples (first 20 and last 20):
${JSON.stringify([...dataStream.slice(0, 20), ...dataStream.slice(-20)])}

Identify: (1) the key physics principle demonstrated, (2) one surprising or counterintuitive insight a student might miss, (3) a real-world application of this exact scenario, (4) one follow-up experiment the student should try.

Return as JSON: {"principle": "...", "insight": "...", "application": "...", "experiment": "..."}`

        const systemPrompt = 'You are a physics tutor AI. Always respond with valid JSON containing exactly these four keys: principle, insight, application, experiment. Keep each value to 1-2 sentences.'
        
        const response = await callClaudeAPI(prompt, systemPrompt)
        
        if (response) {
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              setAnalysis(parsed)
            }
          } catch (e) {
            console.warn('Failed to parse AI response, using local analysis:', e)
            setAnalysis(getLocalAnalysis(simulationType, dataStream, variables))
          }
        } else {
          setAnalysis(getLocalAnalysis(simulationType, dataStream, variables))
        }
        
        setAnalysisLoading(false)
      }, 2000)
    }
    
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
  }, [dataStream, simulationType, currentTime])
  
  const generateQuiz = useCallback(async () => {
    setShowQuiz(true)
    
    const prompt = `Generate a multiple choice question based on this simulation data for ${simulationType}.
    
Data: ${JSON.stringify(dataStream.slice(-50))}
Variables: ${JSON.stringify(variables)}

Create a question with 4 options where only one is correct. Return JSON: {"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}`

    const systemPrompt = 'You are a quiz generator. Respond with valid JSON containing: question, options (array of 4 strings), correctIndex (0-3), and explanation.'

    const response = await callClaudeAPI(prompt, systemPrompt)
    
    if (response) {
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          setQuiz(JSON.parse(jsonMatch[0]))
          return
        }
      } catch (e) {
        console.warn('Failed to parse quiz response, using local quiz:', e)
      }
    }
    
    setQuiz(generateLocalQuiz(simulationType, dataStream, variables))
      } catch (e) {
        setQuiz({
          question: `At t=${currentTime.toFixed(1)}s, what is the current value?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 0,
          explanation: 'This is a fallback question.'
        })
      }
    } else {
      setQuiz({
        question: `At t=${currentTime.toFixed(1)}s, what is the current value?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        explanation: 'Fallback question.'
      })
    }
  }, [dataStream, simulationType, currentTime, variables])
  
  const handleQuizAnswer = useCallback((selectedIndex, correctIndex) => {
    const isCorrect = selectedIndex === correctIndex
    setShowQuiz(false)
    onQuizAnswer?.(isCorrect)
  }, [onQuizAnswer])
  
  const chartComponent = useMemo(() => {
    if (compareData && compareData.length > 0) {
      return <CompareCharts datasets={compareData} currentTime={currentTime} />
    }
    
    switch (simulationType) {
      case 'projectile':
        return <ProjectileCharts dataStream={dataStream} currentTime={currentTime} anomalousData={anomalousData} />
      case 'pendulum':
        return <PendulumCharts dataStream={dataStream} currentTime={currentTime} anomalousData={anomalousData} />
      case 'circular_motion':
      case 'energy':
        return <EnergyCharts dataStream={dataStream} currentTime={currentTime} anomalousData={anomalousData} />
      case 'inclined_plane':
      default:
        return <InclinedPlaneCharts dataStream={dataStream} currentTime={currentTime} anomalousData={anomalousData} />
    }
  }, [simulationType, dataStream, currentTime, anomalousData, compareData])
  
  const handleExportCSV = useCallback(() => {
    exportToCSV(dataStream, `${simulationType}_data.csv`)
  }, [dataStream, simulationType])

  return (
    <section className="flex flex-col gap-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono-display text-xs uppercase tracking-[0.24em] text-slate-400">
          Live Telemetry
        </p>
        <div className="flex items-center gap-2">
          {dataStream.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 font-mono-display text-xs text-slate-300 transition-all hover:bg-white/10"
            >
              📥 CSV
            </button>
          )}
          <button
            onClick={generateQuiz}
            disabled={dataStream.length < 10}
            className="rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-1 font-mono-display text-xs text-purple-400 transition-all hover:bg-purple-500/20 disabled:opacity-40"
          >
            🧠 Quiz Me
          </button>
          {dataStream.length > 0 && (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono-display text-xs text-slate-300">
              {dataStream.length} samples
            </div>
          )}
        </div>
      </div>

      {drift > 0.05 && <EnergyConservationAlert drift={drift} />}

      {chartComponent}

      <KeyInsightBox 
        insight={analysis?.insight} 
        loading={analysisLoading} 
      />

      <PhysicsTutorPanel analysis={analysis} loading={analysisLoading} />

      {showQuiz && quiz && (
        <QuizModal 
          quiz={quiz} 
          onClose={() => setShowQuiz(false)} 
          onAnswer={handleQuizAnswer} 
        />
      )}
    </section>
  )
}
