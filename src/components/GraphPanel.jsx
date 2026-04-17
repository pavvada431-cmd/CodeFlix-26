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
import Panel from './ui/Panel'
import Badge from './ui/Badge'

const AXIS_STYLE = {
  tick: { fill: '#9ca3af', fontSize: 11 },
  axisLine: { stroke: '#1f2937' },
  tickLine: { stroke: '#1f2937' },
}

const GRID_STYLE = {
  strokeDasharray: '2 2',
  stroke: '#1f2937',
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#0b0f17] px-3 py-2 shadow-lg">
      <p className="text-xs text-[#9ca3af]">t = {Number(label || 0).toFixed(2)}s</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value || 0).toFixed(3)}
        </p>
      ))}
    </div>
  )
}

function EmptyGraphState() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-[#1f2937] bg-[#0b0f17]">
      <p className="text-sm text-[#9ca3af]">Run a simulation to generate graph data.</p>
    </div>
  )
}

export default function GraphPanel({
  simulationType = 'inclined_plane',
  dataStream = [],
  accentColor = '#22d3ee',
}) {
  const latestTime = useMemo(() => {
    if (!dataStream.length) return 0
    return dataStream[dataStream.length - 1]?.t || 0
  }, [dataStream])

  const chartKeys = useMemo(() => {
    if (!dataStream.length) return []
    return Object.keys(dataStream[0]).filter((key) => key !== 't' && Number.isFinite(dataStream[0][key]))
  }, [dataStream])

  const primaryKey = chartKeys[0] || 'value'
  const secondaryKey = chartKeys[1] || chartKeys[0] || 'value'

  return (
    <Panel
      title="Graphs"
      subtitle={`Telemetry for ${simulationType || 'simulation'}`}
      action={<Badge variant="neutral">{dataStream.length} samples</Badge>}
    >
      {!dataStream.length ? (
        <EmptyGraphState />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-[#1f2937] bg-[#0b0f17] p-3">
            <p className="mb-2 text-xs text-[#9ca3af]">{primaryKey} vs time</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dataStream} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#9ca3af', fontSize: 11 }} {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip content={<TooltipContent />} />
                <Line
                  type="monotone"
                  dataKey={primaryKey}
                  name={primaryKey}
                  stroke={accentColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                {latestTime > 0 ? <ReferenceLine x={latestTime} stroke="#374151" strokeDasharray="3 3" /> : null}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-[#1f2937] bg-[#0b0f17] p-3">
            <p className="mb-2 text-xs text-[#9ca3af]">{secondaryKey} vs time</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dataStream} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="t" type="number" domain={[0, 'auto']} label={{ value: 'Time (s)', position: 'bottom', fill: '#9ca3af', fontSize: 11 }} {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip content={<TooltipContent />} />
                <Line
                  type="monotone"
                  dataKey={secondaryKey}
                  name={secondaryKey}
                  stroke="#94a3b8"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                />
                {latestTime > 0 ? <ReferenceLine x={latestTime} stroke="#374151" strokeDasharray="3 3" /> : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Panel>
  )
}
