import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

const PI = Math.PI
const WAVE_POINTS = 200
const LONGITUDINAL_POINTS = 100

function createLabelTexture(text, color = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.roundRect(0, 0, 512, 64, 8)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(text, 256, 42)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function TransverseWave({ amplitude, frequency, wavelength, time }) {
  const k = (2 * PI) / wavelength
  const omega = 2 * PI * frequency

  const sphereRefs = useRef([])
  const positions = useMemo(() => {
    const pos = []
    for (let i = 0; i < WAVE_POINTS; i++) {
      const x = (i / (WAVE_POINTS - 1) - 0.5) * 8
      pos.push(x)
    }
    return pos
  }, [])

  useEffect(() => {
    sphereRefs.current.forEach((ref, idx) => {
      if (ref) {
        const x = positions[idx]
        const y = amplitude * Math.sin(k * x - omega * time)
        ref.position.y = y
        const intensity = Math.abs(y) / amplitude
        ref.material.emissiveIntensity = intensity * 0.5
      }
    })
  }, [time, amplitude, k, omega, positions])

  return (
    <group>
      {positions.map((x, i) => (
        <mesh
          key={i}
          ref={el => sphereRefs.current[i] = el}
          position={[x, 0, 0]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color="#00f5ff"
            emissive="#00f5ff"
            emissiveIntensity={0.2}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

function LongitudinalWave({ amplitude, frequency, wavelength, time }) {
  const k = (2 * PI) / wavelength
  const omega = 2 * PI * frequency

  const slabRefs = useRef([])

  useEffect(() => {
    slabRefs.current.forEach((ref, idx) => {
      if (ref) {
        const baseX = (idx / (LONGITUDINAL_POINTS - 1) - 0.5) * 8
        const displacement = amplitude * Math.sin(k * baseX - omega * time)
        const scaleX = 0.3 + 0.7 * (1 + displacement / amplitude)
        ref.scale.x = scaleX
        ref.material.color.setHSL(0.55 - (displacement / amplitude) * 0.1, 0.8, 0.5)
      }
    })
  }, [time, amplitude, k, omega])

  const getXPosition = (idx) => {
    const baseX = (idx / (LONGITUDINAL_POINTS - 1) - 0.5) * 8
    const displacement = amplitude * Math.sin(k * baseX - omega * time)
    return baseX + displacement * 0.5
  }

  return (
    <group>
      {Array.from({ length: LONGITUDINAL_POINTS }, (_, i) => (
        <mesh
          key={i}
          ref={el => slabRefs.current[i] = el}
          position={[getXPosition(i), 0, 0]}
        >
          <boxGeometry args={[0.15, 0.4, 0.4]} />
          <meshStandardMaterial
            color="#ff8800"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

function StandingWave({ amplitude, frequency, wavelength, time }) {
  const k = (2 * PI) / wavelength
  const omega = 2 * PI * frequency

  const nodes = []
  const numNodes = Math.floor(8 / (wavelength / 2))
  for (let n = 0; n < numNodes; n++) {
    const x = (n - numNodes / 2) * (wavelength / 2)
    nodes.push(x)
  }

  const sphereRefs = useRef([])
  const nodeRefs = useRef([])

  const positions = useMemo(() => {
    const pos = []
    for (let i = 0; i < WAVE_POINTS; i++) {
      const x = (i / (WAVE_POINTS - 1) - 0.5) * 8
      pos.push(x)
    }
    return pos
  }, [])

  useEffect(() => {
    sphereRefs.current.forEach((ref, idx) => {
      if (ref) {
        const x = positions[idx]
        const y = 2 * amplitude * Math.cos(k * x) * Math.sin(omega * time)
        ref.position.y = y
        const intensity = Math.abs(y) / (2 * amplitude)
        ref.material.emissiveIntensity = intensity * 0.5
      }
    })

    nodeRefs.current.forEach((ref) => {
      if (ref) {
        ref.material.opacity = 0.3 + 0.7 * Math.abs(Math.sin(omega * time))
      }
    })
  }, [time, amplitude, k, omega, positions])

  return (
    <group>
      {positions.map((x, i) => (
        <mesh
          key={i}
          ref={el => sphereRefs.current[i] = el}
          position={[x, 0, 0]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color="#ff00ff"
            emissive="#ff00ff"
            emissiveIntensity={0.2}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}

      {nodes.map((x, i) => (
        <mesh
          key={`node-${i}`}
          ref={el => nodeRefs.current[i] = el}
          position={[x, 0, 0]}
        >
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={1}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

function InterferenceWave({ amplitude, frequency, wavelength, time }) {
  const k = (2 * PI) / wavelength
  const omega = 2 * PI * frequency
  const source1X = -2
  const source2X = 2

  const sphereRefs = useRef([])
  const positions = useMemo(() => {
    const pos = []
    for (let i = 0; i < WAVE_POINTS; i++) {
      const x = (i / (WAVE_POINTS - 1) - 0.5) * 8
      pos.push(x)
    }
    return pos
  }, [])

  useEffect(() => {
    sphereRefs.current.forEach((ref, idx) => {
      if (ref) {
        const x = positions[idx]
        const d1 = Math.abs(x - source1X)
        const d2 = Math.abs(x - source2X)
        const y1 = amplitude * Math.sin(k * d1 - omega * time)
        const y2 = amplitude * Math.sin(k * d2 - omega * time)
        const y = y1 + y2
        ref.position.y = y

        const normalizedDisplacement = y / (2 * amplitude)
        const hue = 0.5 - normalizedDisplacement * 0.15
        const lightness = 0.3 + Math.abs(normalizedDisplacement) * 0.4
        ref.material.color.setHSL(hue, 0.8, lightness)
        ref.material.emissive.setHSL(hue, 0.8, 0.3)
        ref.material.emissiveIntensity = Math.abs(normalizedDisplacement)
      }
    })
  }, [time, amplitude, k, omega, positions])

  return (
    <group>
      {positions.map((x, i) => (
        <mesh
          key={i}
          ref={el => sphereRefs.current[i] = el}
          position={[x, 0, 0]}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#00f5ff"
            emissive="#00f5ff"
            emissiveIntensity={0.2}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}

      <mesh position={[source1X, 0.5, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} />
      </mesh>
      <mesh position={[source2X, 0.5, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} />
      </mesh>
    </group>
  )
}

function WaveHeatmap({ amplitude, frequency, wavelength, time, waveType }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = 400
    const height = 60
    canvas.width = width
    canvas.height = height

    const k = (2 * PI) / wavelength
    const omega = 2 * PI * frequency
    const source1X = -2
    const source2X = 2

    const imageData = ctx.createImageData(width, height)

    for (let px = 0; px < width; px++) {
      const x = (px / width - 0.5) * 8
      let displacement = 0

      switch (waveType) {
        case 'transverse': {
          displacement = amplitude * Math.sin(k * x - omega * time)
          break
        }
        case 'standing': {
          displacement = 2 * amplitude * Math.cos(k * x) * Math.sin(omega * time)
          break
        }
        case 'interference': {
          const d1 = Math.abs(x - source1X)
          const d2 = Math.abs(x - source2X)
          displacement = amplitude * (Math.sin(k * d1 - omega * time) + Math.sin(k * d2 - omega * time))
          break
        }
        default: {
          displacement = amplitude * Math.sin(k * x - omega * time)
        }
      }

      const maxAmp = waveType === 'standing' ? 2 * amplitude : 2 * amplitude
      const normalized = displacement / maxAmp

      for (let py = 0; py < height; py++) {
        const idx = (py * width + px) * 4
        const distFromCenter = Math.abs(py - height / 2) / (height / 2)
        const intensity = Math.max(0, 1 - distFromCenter)

        if (normalized < 0) {
          imageData.data[idx] = Math.floor(255 * intensity * (-normalized) * 0.5)
          imageData.data[idx + 1] = Math.floor(255 * intensity * (-normalized) * 0.5)
          imageData.data[idx + 2] = Math.floor(255 * intensity)
        } else {
          imageData.data[idx] = Math.floor(255 * intensity)
          imageData.data[idx + 1] = Math.floor(255 * intensity * (1 - normalized) * 0.5)
          imageData.data[idx + 2] = Math.floor(255 * intensity * (1 - normalized) * 0.5)
        }
        imageData.data[idx + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [time, amplitude, wavelength, frequency, waveType])

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-lg border border-[rgba(0,245,255,0.3)]"
      style={{ width: 400, height: 60 }}
    />
  )
}

function WaveScene({
  amplitude,
  frequency,
  wavelength,
  waveType,
  time,
  onDataPoint,
  lastDataTime,
}) {
  const k = (2 * PI) / wavelength
  const omega = 2 * PI * frequency
  const waveSpeed = (omega / k).toFixed(2)

  const waveEquation = useMemo(() => {
    switch (waveType) {
      case 'transverse':
        return `y(x,t) = ${amplitude.toFixed(2)}·sin(${k.toFixed(2)}x - ${omega.toFixed(2)}t)`
      case 'longitudinal':
        return `x(x,t) = x₀ + ${amplitude.toFixed(2)}·sin(${k.toFixed(2)}x₀ - ${omega.toFixed(2)}t)`
      case 'standing':
        return `y(x,t) = ${(2 * amplitude).toFixed(2)}·cos(${k.toFixed(2)}x)·sin(${omega.toFixed(2)}t)`
      case 'interference':
        return `y = A·sin(kd₁-ωt) + A·sin(kd₂-ωt)`
      default:
        return `y(x,t) = A·sin(kx - ωt)`
    }
  }, [waveType, amplitude, k, omega])

  const infoTextures = useMemo(() => ({
    equation: createLabelTexture(waveEquation, '#00f5ff'),
    params: createLabelTexture(`A=${amplitude}m f=${frequency}Hz λ=${wavelength}m v=${waveSpeed}m/s`, '#ffff00'),
    type: createLabelTexture(`Type: ${waveType.toUpperCase()}`, '#ff88ff'),
  }), [waveEquation, waveSpeed, amplitude, frequency, wavelength, waveType])

  useEffect(() => {
    if (Date.now() - lastDataTime < 50) return

    const x0 = 0
    const xHalf = wavelength / 2

    let dispX0 = 0, dispXHalf = 0, energy = 0

    switch (waveType) {
      case 'transverse': {
        dispX0 = amplitude * Math.sin(-omega * time)
        dispXHalf = amplitude * Math.sin(k * xHalf - omega * time)
        energy = 0.5 * amplitude * amplitude * frequency * 100
        break
      }
      case 'standing': {
        dispX0 = 2 * amplitude * Math.cos(0) * Math.sin(omega * time)
        dispXHalf = 2 * amplitude * Math.cos(k * xHalf) * Math.sin(omega * time)
        energy = 0.5 * (2 * amplitude) * (2 * amplitude) * frequency * 100
        break
      }
      case 'interference': {
        const d1_0 = Math.abs(x0 - (-2))
        const d2_0 = Math.abs(x0 - 2)
        dispX0 = amplitude * (Math.sin(k * d1_0 - omega * time) + Math.sin(k * d2_0 - omega * time))
        const d1_h = Math.abs(xHalf - (-2))
        const d2_h = Math.abs(xHalf - 2)
        dispXHalf = amplitude * (Math.sin(k * d1_h - omega * time) + Math.sin(k * d2_h - omega * time))
        energy = amplitude * amplitude * frequency * 200
        break
      }
      default: {
        dispX0 = amplitude * Math.sin(-omega * time)
        dispXHalf = amplitude * Math.sin(k * xHalf - omega * time)
        energy = 0.5 * amplitude * amplitude * frequency * 100
      }
    }

    onDataPoint?.({
      t: time,
      displacement_at_x0: dispX0,
      displacement_at_x_half_lambda: dispXHalf,
      energy,
    })
  }, [time, amplitude, k, omega, wavelength, waveType, onDataPoint, lastDataTime])

  const renderWave = () => {
    switch (waveType) {
      case 'transverse':
        return <TransverseWave amplitude={amplitude} frequency={frequency} wavelength={wavelength} time={time} />
      case 'longitudinal':
        return <LongitudinalWave amplitude={amplitude} frequency={frequency} wavelength={wavelength} time={time} />
      case 'standing':
        return <StandingWave amplitude={amplitude} frequency={frequency} wavelength={wavelength} time={time} />
      case 'interference':
        return <InterferenceWave amplitude={amplitude} frequency={frequency} wavelength={wavelength} time={time} />
      default:
        return <TransverseWave amplitude={amplitude} frequency={frequency} wavelength={wavelength} time={time} />
    }
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <pointLight position={[0, 2, 2]} intensity={0.5} color="#00f5ff" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[10, 3]} />
        <meshStandardMaterial color="#0a0f1e" />
      </mesh>

      <mesh position={[0, -1.2, 0]}>
        <boxGeometry args={[8, 0.02, 0.5]} />
        <meshStandardMaterial color="#334455" metalness={0.7} />
      </mesh>

      {renderWave()}

      <sprite scale={[5, 0.6, 1]} position={[0, 2.5, 0]}>
        <spriteMaterial map={infoTextures.equation} transparent />
      </sprite>
      <sprite scale={[5, 0.5, 1]} position={[0, 2.2, 0]}>
        <spriteMaterial map={infoTextures.params} transparent />
      </sprite>
      <sprite scale={[2, 0.4, 1]} position={[-3, 1.5, 0]}>
        <spriteMaterial map={infoTextures.type} transparent />
      </sprite>
    </>
  )
}

function PositionGraph({ amplitude, frequency, wavelength, time, waveType }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = 300
    const height = 150
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()

    ctx.strokeStyle = '#00f5ff'
    ctx.lineWidth = 2
    ctx.beginPath()

    const k = (2 * Math.PI) / wavelength
    const omega = 2 * Math.PI * frequency

    for (let px = 0; px < width; px++) {
      const x = (px / width - 0.5) * 8
      let y = 0

      switch (waveType) {
        case 'transverse':
          y = amplitude * Math.sin(k * x - omega * time)
          break
        case 'standing':
          y = 2 * amplitude * Math.cos(k * x) * Math.sin(omega * time)
          break
        case 'interference': {
          const d1 = Math.abs(x - (-2))
          const d2 = Math.abs(x - 2)
          y = amplitude * (Math.sin(k * d1 - omega * time) + Math.sin(k * d2 - omega * time))
          break
        }
        default:
          y = amplitude * Math.sin(k * x - omega * time)
      }

      const maxAmp = waveType === 'standing' ? 2 * amplitude : 2 * amplitude
      const screenY = height / 2 - (y / maxAmp) * (height / 2 - 10)

      if (px === 0) {
        ctx.moveTo(px, screenY)
      } else {
        ctx.lineTo(px, screenY)
      }
    }
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.fillText('Position', width / 2, height - 5)
    ctx.save()
    ctx.translate(10, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('y', 0, 0)
    ctx.restore()
  }, [time, amplitude, frequency, wavelength, waveType])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-16 left-4 rounded-lg border border-[rgba(0,245,255,0.3)]"
      style={{ width: 300, height: 150 }}
    />
  )
}

function OscillationGraph({ amplitude, frequency, wavelength, time, waveType }) {
  const canvasRef = useRef(null)
  const dataRef = useRef([])

  useEffect(() => {
    const k = (2 * Math.PI) / wavelength
    const omega = 2 * Math.PI * frequency

    let disp = 0
    switch (waveType) {
      case 'transverse':
        disp = amplitude * Math.sin(-omega * time)
        break
      case 'standing':
        disp = 2 * amplitude * Math.cos(0) * Math.sin(omega * time)
        break
      case 'interference': {
        const d1 = Math.abs(0 - (-2))
        const d2 = Math.abs(0 - 2)
        disp = amplitude * (Math.sin(k * d1 - omega * time) + Math.sin(k * d2 - omega * time))
        break
      }
      default:
        disp = amplitude * Math.sin(-omega * time)
    }

    dataRef.current = [...dataRef.current.slice(-100), { t: time, y: disp }]
    if (dataRef.current.length > 100) {
      dataRef.current = dataRef.current.slice(-100)
    }
  }, [time, amplitude, frequency, wavelength, waveType])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = 300
    const height = 150
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    ctx.strokeStyle = '#ff8800'
    ctx.lineWidth = 2
    ctx.beginPath()

    const data = dataRef.current
    if (data.length > 1) {
      const tMin = data[0].t
      const tMax = data[data.length - 1].t
      const tRange = Math.max(tMax - tMin, 0.001)

      data.forEach((point, i) => {
        const px = ((point.t - tMin) / tRange) * width
        const maxAmp = waveType === 'standing' ? 2 * amplitude : 2 * amplitude
        const py = height / 2 - (point.y / maxAmp) * (height / 2 - 10)
        if (i === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      })
    }
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.fillText('Time', width / 2, height - 5)
    ctx.fillText('x=0', 5, 15)
  }, [time, amplitude, wavelength, waveType])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-16 right-4 rounded-lg border border-[rgba(255,136,0,0.3)]"
      style={{ width: 300, height: 150 }}
    />
  )
}

export default function WaveMotion({
  amplitude = 0.5,
  frequency = 1,
  wavelength = 2,
  waveType = 'transverse',
  isPlaying = false,
  onDataPoint,
}) {
  const [time, setTime] = useState(0)
  const [lastDataTime, setLastDataTime] = useState(0)
  const startTimeRef = useRef(0)
  const animationRef = useRef(null)

  const waveTypes = ['transverse', 'longitudinal', 'standing', 'interference']

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now() / 1000
    }

    const animate = () => {
      const currentTime = performance.now() / 1000
      const elapsed = currentTime - startTimeRef.current
      setTime(elapsed)
      setLastDataTime(currentTime)
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) {
      requestAnimationFrame(() => {
        setTime(0)
        startTimeRef.current = 0
      })
    }
  }, [isPlaying, amplitude, frequency, wavelength, waveType])

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.5, 6], fov: 50 }}
        style={{ background: '#0a0f1e' }}
      >
        <WaveScene
          amplitude={amplitude}
          frequency={frequency}
          wavelength={wavelength}
          waveType={waveType}
          time={time}
          onDataPoint={onDataPoint}
          lastDataTime={lastDataTime}
        />
      </Canvas>

      <WaveHeatmap
        amplitude={amplitude}
        frequency={frequency}
        wavelength={wavelength}
        time={time}
        waveType={waveType}
      />

      <PositionGraph
        amplitude={amplitude}
        frequency={frequency}
        wavelength={wavelength}
        time={time}
        waveType={waveType}
      />

      <OscillationGraph
        amplitude={amplitude}
        frequency={frequency}
        wavelength={wavelength}
        time={time}
        waveType={waveType}
      />

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
        {waveTypes.map(type => (
          <button
            key={type}
            onClick={() => {}}
            className={`rounded-full border px-3 py-1.5 font-mono-display text-xs uppercase tracking-wider transition ${
              waveType === type
                ? 'border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00f5ff]">
        T = {(1 / frequency).toFixed(3)}s
      </div>
    </div>
  )
}

WaveMotion.getSceneConfig = (variables = {}) => {
  const {
    amplitude = 0.5,
    frequency = 1,
    wavelength = 2,
    waveType = 'transverse'
  } = variables

  const k = (2 * Math.PI) / wavelength
  const omega = 2 * Math.PI * frequency
  const waveSpeed = omega / k

  return {
    name: 'Wave Motion',
    description: `${waveType} wave visualization`,
    type: 'wave_motion',
    physics: {
      amplitude,
      frequency,
      wavelength,
      waveType,
      waveNumber: k,
      angularFrequency: omega,
      waveSpeed,
      period: 1 / frequency,
    },
    calculations: {
      waveSpeed: `v = λf = ${wavelength} × ${frequency} = ${waveSpeed.toFixed(2)} m/s`,
      period: `T = 1/f = ${(1 / frequency).toFixed(3)} s`,
      equation: `y = ${amplitude}·sin(${k.toFixed(2)}x - ${omega.toFixed(2)}t)`,
    },
  }
}
