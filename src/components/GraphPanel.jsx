import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#0d1117]/95 px-3 py-2 shadow-lg">
        <p className="font-mono-display text-xs text-slate-400">t = {label.toFixed(2)}s</p>
        <p className="font-mono-display text-sm text-[#00f5ff]">
          {payload[0].name}: {payload[0].value.toFixed(3)}
        </p>
      </div>
    )
  }
  return null
}

function InclinedPlaneCharts({ dataStream, currentTime }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
          Velocity vs Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 'auto']}
              label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <YAxis
              label={{ value: 'Velocity (m/s)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="velocity"
              name="Velocity"
              stroke="#00f5ff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {currentTime > 0 && (
              <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
          Acceleration vs Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 'auto']}
              label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <YAxis
              label={{ value: 'Acceleration (m/s²)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="acceleration"
              name="Acceleration"
              stroke="#00f5ff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {currentTime > 0 && (
              <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ProjectileCharts({ dataStream, currentTime }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
          Height vs Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 'auto']}
              label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <YAxis
              label={{ value: 'Height (m)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }}
              domain={[0, 'auto']}
              {...AXIS_STYLE}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="height"
              name="Height"
              stroke="#00f5ff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {currentTime > 0 && (
              <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
          Horizontal Distance vs Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 'auto']}
              label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <YAxis
              label={{ value: 'Distance (m)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }}
              domain={[0, 'auto']}
              {...AXIS_STYLE}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="distance"
              name="Distance"
              stroke="#00f5ff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {currentTime > 0 && (
              <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PendulumCharts({ dataStream, currentTime }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
          Angle vs Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 'auto']}
              label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <YAxis
              label={{ value: 'Angle (rad)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }}
              domain={[-1.5, 1.5]}
              {...AXIS_STYLE}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="angle"
              name="Angle"
              stroke="#00f5ff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {currentTime > 0 && (
              <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={CHART_STYLE} className="border border-white/10">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
          Angular Velocity vs Time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataStream} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 'auto']}
              label={{ value: 'Time (s)', position: 'bottom', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <YAxis
              label={{ value: 'Angular Vel (rad/s)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }}
              {...AXIS_STYLE}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="velocity"
              name="Velocity"
              stroke="#00f5ff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {currentTime > 0 && (
              <ReferenceLine x={currentTime} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="4 4" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function getFallbackInsight(simulationType, variables) {
  const staticInsights = {
    inclined_plane: {
      friction: "Notice: adding friction reduces the final velocity and acceleration. The block reaches a terminal velocity determined by the coefficient of friction.",
      mass: "Notice: changing mass does not affect final velocity on a frictionless incline. All objects accelerate at the same rate due to gravity components along the slope.",
      angle: "Notice: increasing the incline angle increases acceleration. The component of gravity along the slope is g·sin(θ).",
    },
    projectile: {
      velocity: "Notice: initial velocity affects both range and maximum height quadratically. Doubling velocity quadruples the range.",
      angle: "Notice: 45° provides maximum range for level ground launches. Optimal angles decrease when accounting for launch/landing heights.",
      height: "Notice: launching from a height increases range but changes the optimal angle to less than 45°.",
    },
    pendulum: {
      length: "Notice: pendulum period depends only on length and gravity (T = 2π√(L/g)). Mass has no effect on period.",
      angle: "Notice: for small angles, period is independent of amplitude. Large angles show period increases with amplitude.",
      gravity: "Notice: period is inversely proportional to √g. A pendulum swings faster on planets with stronger gravity.",
    },
  }

  const typeInsights = staticInsights[simulationType]
  if (typeInsights && variables) {
    const varKey = Object.keys(variables).find(k => typeInsights[k])
    if (varKey && variables[varKey]) {
      return typeInsights[varKey]
    }
  }
  return null
}

function KeyInsightBox({ insight, loading }) {
  return (
    <div
      style={CHART_STYLE}
      className="mt-4 border border-[rgba(0,245,255,0.2)] bg-[linear-gradient(180deg,rgba(0,245,255,0.06),rgba(0,245,255,0.02))]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)]">
          <svg
            className="h-4 w-4 text-[#00f5ff]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
          Key Insight
        </p>
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
          <p className="text-sm text-slate-500">
            Run the simulation to see physics insights...
          </p>
        )}
      </div>
    </div>
  )
}

export default function GraphPanel({
  simulationType = 'inclined_plane',
  dataStream = [],
  variables = {},
}) {
  const currentTime = useMemo(() => {
    if (dataStream.length > 0) {
      return dataStream[dataStream.length - 1].t || 0
    }
    return 0
  }, [dataStream])

  const keyInsight = useMemo(() => {
    if (!dataStream || dataStream.length < 20) {
      return null
    }
    return getFallbackInsight(simulationType, variables)
  }, [simulationType, dataStream, variables])

  const chartComponent = useMemo(() => {
    switch (simulationType) {
      case 'projectile':
        return <ProjectileCharts dataStream={dataStream} currentTime={currentTime} />
      case 'pendulum':
        return <PendulumCharts dataStream={dataStream} currentTime={currentTime} />
      case 'inclined_plane':
      default:
        return <InclinedPlaneCharts dataStream={dataStream} currentTime={currentTime} />
    }
  }, [simulationType, dataStream, currentTime])

  const displayInsight = dataStream.length === 0 ? null : keyInsight
  const showLoading = false

  return (
    <section className="flex flex-col gap-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono-display text-xs uppercase tracking-[0.24em] text-slate-400">
          Live Telemetry
        </p>
        {dataStream.length > 0 && (
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono-display text-xs text-slate-300">
            {dataStream.length} samples
          </div>
        )}
      </div>

      {chartComponent}

      <KeyInsightBox insight={displayInsight} loading={showLoading} />
    </section>
  )
}
