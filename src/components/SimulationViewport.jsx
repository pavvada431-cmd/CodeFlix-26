import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import ProjectileScene from '../simulations/ProjectileScene'
import { formatNumber } from '../utils/formatters'

const telemetry = [
  {
    key: 'horizontalVelocity',
    label: 'vx',
    unit: 'm/s',
  },
  {
    key: 'verticalVelocity',
    label: 'vy',
    unit: 'm/s',
  },
  {
    key: 'apexTime',
    label: 'Apex',
    unit: 's',
  },
  {
    key: 'impactSpeed',
    label: 'Impact',
    unit: 'm/s',
  },
]

function SimulationViewport({ solution }) {
  return (
    <section className="relative min-h-[760px] overflow-hidden rounded-[34px] border border-[rgba(0,245,255,0.14)] bg-[var(--color-bg)]/85 shadow-[0_26px_90px_rgba(2,8,23,0.6)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,245,255,0.12),transparent_32%),linear-gradient(180deg,rgba(10,15,30,0.12),rgba(10,15,30,0.55))]" />

      <div className="relative flex h-full flex-col">
        <div className="flex flex-col gap-5 border-b border-white/10 px-6 py-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="font-mono-display text-xs uppercase tracking-[0.32em] text-[rgba(0,245,255,0.72)]">
              3D Simulation
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white">
              Spatial trajectory playback
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Inspect the projectile path in orbit view while the left panel
              updates the analytic derivation in real time.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {telemetry.map((item) => (
              <div
                key={item.key}
                className="rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-3"
              >
                <p className="font-mono-display text-xs uppercase tracking-[0.26em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatNumber(solution[item.key])}
                  <span className="ml-2 font-mono-display text-sm text-[#00f5ff]">
                    {item.unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-6 top-5 z-10 flex flex-wrap gap-2">
            <span className="rounded-full border border-[rgba(0,245,255,0.25)] bg-[rgba(0,245,255,0.1)] px-3 py-1 font-mono-display text-[11px] uppercase tracking-[0.28em] text-[#00f5ff]">
              Orbit Enabled
            </span>
            <span className="rounded-full border border-white/10 bg-[var(--color-bg)]/85 px-3 py-1 font-mono-display text-[11px] uppercase tracking-[0.28em] text-slate-300">
              Range {formatNumber(solution.range)} m
            </span>
          </div>

          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [8, 5.5, 10.5], fov: 42 }}
          >
            <Suspense fallback={null}>
              <ProjectileScene solution={solution} />
            </Suspense>
          </Canvas>
        </div>
      </div>
    </section>
  )
}

export default SimulationViewport
