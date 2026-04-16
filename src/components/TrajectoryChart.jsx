import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '../utils/formatters'

function TrajectoryChart({ data }) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[#081221]/78 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-display text-xs uppercase tracking-[0.32em] text-[rgba(0,245,255,0.72)]">
            Motion Trace
          </p>
          <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-white">
            Height vs. distance
          </h2>
        </div>

        <p className="font-mono-display text-xs uppercase tracking-[0.26em] text-slate-400">
          Analytic path sampled across the full flight
        </p>
      </div>

      <div className="mt-5 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, right: 14, bottom: 0, left: -18 }}
          >
            <CartesianGrid
              stroke="rgba(148, 163, 184, 0.15)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="x"
              stroke="#94a3b8"
              tick={{ fontFamily: 'Space Mono', fontSize: 11 }}
              tickFormatter={(value) => `${formatNumber(value, 0)}m`}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontFamily: 'Space Mono', fontSize: 11 }}
              tickFormatter={(value) => `${formatNumber(value, 0)}m`}
            />
            <Tooltip
              cursor={{ stroke: '#00f5ff', strokeOpacity: 0.18 }}
              contentStyle={{
                backgroundColor: '#0b1324',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                fontFamily: 'Space Mono, monospace',
              }}
              formatter={(value) => `${formatNumber(value)} m`}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload
                return point
                  ? `t = ${formatNumber(point.time)} s`
                  : 'Trajectory sample'
              }}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke="#00f5ff"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#00f5ff',
                stroke: '#0a0f1e',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default TrajectoryChart
