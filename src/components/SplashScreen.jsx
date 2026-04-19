import { useEffect, useState } from 'react'

function AnimatedLogo({ onComplete }) {
  const [tick, setTick] = useState(0)
  const [phase, setPhase] = useState('particles')

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
      if (tick > 30 && phase === 'particles') {
        setPhase('logo')
      }
      if (tick > 45) {
        clearInterval(interval)
        onComplete()
      }
    }, 66)

    return () => clearInterval(interval)
  }, [onComplete, tick, phase])

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: ((i * 37 + tick * 3) % 100),
    y: ((i * 23 + tick * (0.5 + (i % 5) * 0.3)) % 100),
    size: 2 + (i % 3),
    opacity: 0.3 + (i % 4) * 0.15,
  }))

  const sinePath = Array.from({ length: 40 }, (_, i) => {
    const x = i * 5
    const y = 15 + Math.sin((x + tick * 0.5) / 6) * 8
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[var(--color-bg)]">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#00f5ff]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            boxShadow: '0 0 8px rgba(0, 245, 255, 0.5)',
          }}
        />
      ))}

      <div className="relative z-10">
        <svg
          className={`h-32 w-32 transition-all duration-1000 ${
            phase === 'logo' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f5ff" />
              <stop offset="100%" stopColor="#00a5af" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#logoGradient)"
            strokeWidth="2"
            filter="url(#glow)"
          />

          <text
            x="50"
            y="58"
            textAnchor="middle"
            fontSize="40"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
            fill="url(#logoGradient)"
            filter="url(#glow)"
          >
            S
          </text>
        </svg>

        <svg
          className="absolute -bottom-8 left-1/2 h-8 w-48 -translate-x-1/2"
          viewBox="0 0 200 30"
        >
          <path
            d={sinePath}
            fill="none"
            stroke="#00f5ff"
            strokeWidth="2"
            opacity="0.5"
          />
        </svg>
      </div>

      <h1
        className={`mt-24 font-heading text-5xl font-bold tracking-tight text-white transition-all duration-1000 ${
          phase === 'logo' ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
        style={{ textShadow: '0 0 30px rgba(0, 245, 255, 0.5)' }}
      >
        SimuSolve
      </h1>

      <p
        className={`mt-4 max-w-md text-center text-lg leading-relaxed text-[#8892a4] transition-all duration-1000 delay-300 ${
          phase === 'logo' ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        Turn any physics problem into a living simulation
      </p>

      <div
        className={`mt-16 flex gap-2 transition-all duration-1000 delay-500 ${
          phase === 'logo' ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-[#00f5ff]"
            style={{
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              boxShadow: '0 0 10px rgba(0, 245, 255, 0.8)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function SplashScreen(props) {
  const { onComplete } = props
  const [visible, setVisible] = useState(true)

  const handleComplete = () => {
    setVisible(false)
    if (typeof onComplete === 'function') {
      onComplete()
    }
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <AnimatedLogo onComplete={handleComplete} />
      </div>
    </>
  )
}
