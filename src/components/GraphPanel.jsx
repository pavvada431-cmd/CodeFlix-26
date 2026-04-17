import { useMemo, useState } from 'react'
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

function EmptyGraphState({ mobile = false }) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-[#1f2937] bg-[#0b0f17] ${mobile ? 'h-[60vh]' : 'h-[280px]'}`}>
      <p className="text-sm text-[#9ca3af]">Run a simulation to generate graph data.</p>
    </div>
  )
}

function ChartSurface({
  dataStream,
  dataKey,
  latestTime,
  accentColor,
  height,
  axisStyle = AXIS_STYLE,
  showTimeMarker = true,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={dataStream} margin={{ top: 4, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          dataKey="t"
          type="number"
          domain={[0, 'auto']}
          label={{ value: 'Time (s)', position: 'bottom', fill: '#9ca3af', fontSize: axisStyle.tick.fontSize }}
          {...axisStyle}
        />
        <YAxis {...axisStyle} />
        <Tooltip content={<TooltipContent />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={dataKey}
          stroke={accentColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {showTimeMarker && latestTime > 0 ? <ReferenceLine x={latestTime} stroke="#374151" strokeDasharray="3 3" /> : null}
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function GraphPanel({
  simulationType = 'inclined_plane',
  dataStream = [],
  accentColor = '#22d3ee',
  mobile = false,
}) {
  const latestTime = useMemo(() => {
    if (!dataStream.length) return 0
    return dataStream[dataStream.length - 1]?.t || 0
  }, [dataStream])

  const chartKeys = useMemo(() => {
    if (!dataStream.length) return []
    return Object.keys(dataStream[0]).filter((key) => key !== 't' && Number.isFinite(dataStream[0][key]))
  }, [dataStream])

  const [selectedMetric, setSelectedMetric] = useState('')
  const primaryKey = selectedMetric || chartKeys[0] || 'value'
  const secondaryKey = chartKeys[1] || chartKeys[0] || 'value'
  const availableMetrics = chartKeys.length ? chartKeys : ['value']

  if (mobile) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Graph</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{simulationType || 'simulation'} telemetry</p>
          </div>
          <Badge variant="neutral">{dataStream.length} samples</Badge>
        </div>

        {!dataStream.length ? (
          <EmptyGraphState mobile />
        ) : (
          <>
            <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
              {availableMetrics.map((metric) => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setSelectedMetric(metric)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-sm ${
                    primaryKey === metric ? 'border-cyan-300/50 text-cyan-200' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {metric}
                </button>
              ))}
            </div>
            <div
              className="rounded-xl border border-[#1f2937] bg-[#0b0f17] p-2"
              style={{ touchAction: 'pinch-zoom pan-x pan-y' }}
            >
              <ChartSurface
                dataStream={dataStream}
                dataKey={primaryKey}
                latestTime={latestTime}
                accentColor={accentColor}
                height={360}
                axisStyle={{
                  tick: { fill: '#9ca3af', fontSize: 12 },
                  axisLine: { stroke: '#1f2937' },
                  tickLine: { stroke: '#1f2937' },
                }}
              />
            </div>
          </>
        )}
      </div>
    )
  }

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
            <ChartSurface
              dataStream={dataStream}
              dataKey={primaryKey}
              latestTime={latestTime}
              accentColor={accentColor}
              height={260}
            />
          </div>

          <div className="rounded-xl border border-[#1f2937] bg-[#0b0f17] p-3">
            <p className="mb-2 text-xs text-[#9ca3af]">{secondaryKey} vs time</p>
            <ChartSurface
              dataStream={dataStream}
              dataKey={secondaryKey}
              latestTime={latestTime}
              accentColor="#94a3b8"
              height={260}
            />
          </div>
        </div>
      )}
    </Panel>
  )
}
