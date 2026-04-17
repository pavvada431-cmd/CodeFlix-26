import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
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
  const baseSpacing = 8 / (LONGITUDINAL_POINTS - 1)

  const slabRefs = useRef([])

  useEffect(() => {
    slabRefs.current.forEach((ref, idx) => {
      if (ref) {
        const i = idx
        const displacement = amplitude * Math.sin(k * i * baseSpacing - omega * time)
        const scaleX = 0.3 + 0.7 * (1 + displacement / amplitude)
        ref.scale.x = scaleX
        ref.material.color.setHSL(0.1 - (displacement / amplitude) * 0.1, 0.8, 0.5 + Math.abs(displacement / amplitude) * 0.2)
        ref.material.emissive.setHSL(0.1, 0.5, Math.abs(displacement / amplitude) * 0.3)
        ref.material.emissiveIntensity = Math.abs(displacement / amplitude)
      }
    })
  }, [time, amplitude, k, omega, baseSpacing])

  const getXPosition = useCallback((idx) => {
    let x = 0
    for (let i = 0; i < idx; i++) {
      const displacement = amplitude * Math.sin(k * i * baseSpacing - omega * time)
      x += baseSpacing * (1 + displacement / amplitude * 0.3)
    }
    return (x / LONGITUDINAL_POINTS) * 8 - 4
  }, [amplitude, k, omega, time, baseSpacing])

  return (
    <group>
      {Array.from({ length: LONGITUDINAL_POINTS }, (_, i) => (
        <mesh
          key={i}
          ref={el => slabRefs.current[i] = el}
          position={[(i / (LONGITUDINAL_POINTS - 1) - 0.5) * 8, 0, 0]}
        >
          <boxGeometry args={[0.15, 0.4, 0.4]} />
          <meshStandardMaterial
            color="#ff8800"
            emissive="#ff4400"
            emissiveIntensity={0.2}
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
  const numNodes = Math.floor(8 / (wavelength / 2)) + 1
  for (let n = 0; n < numNodes; n++) {
    const x = -4 + n * (wavelength / 2)
    if (x >= -4 && x <= 4) {
      nodes.push(x)
    }
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
        ref.material.opacity = 0.3 + 0.7 * (1 - Math.abs(Math.sin(omega * time)))
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
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={1.5}
            transparent
            opacity={0.7}
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
        ref.material.color.setHSL(Math.max(0, hue), 0.8, lightness)
        ref.material.emissive.setHSL(Math.max(0, hue), 0.8, 0.3)
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
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
      </mesh>
      <mesh position={[source2X, 0.5, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
      </mesh>

      <mesh position={[source1X, -0.5, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.05, 0.15 + Math.abs(Math.sin(omega * time)) * 0.2, 32]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.3} />
      </mesh>
      <mesh position={[source2X, -0.5, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.05, 0.15 + Math.abs(Math.sin(omega * time)) * 0.2, 32]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.3} />
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
        case 'transverse':
        case 'longitudinal': {
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
      const normalized = displacement / (maxAmp || 1)

      for (let py = 0; py < height; py++) {
        const idx = (py * width + px) * 4
        const distFromCenter = Math.abs(py - height / 2) / (height / 2)
        const intensity = Math.max(0, 1 - distFromCenter)

        if (normalized < 0) {
          const intensityFactor = (-normalized) * intensity
          imageData.data[idx] = Math.floor(50 * intensityFactor)
          imageData.data[idx + 1] = Math.floor(100 * intensityFactor)
          imageData.data[idx + 2] = Math.floor(255 * intensity)
        } else {
          const intensityFactor = normalized * intensity
          imageData.data[idx] = Math.floor(255 * intensity)
          imageData.data[idx + 1] = Math.floor(100 * intensityFactor)
          imageData.data[idx + 2] = Math.floor(50 * intensityFactor)
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

function GraphPanel({ mode, amplitude, frequency, wavelength, time, waveType }) {
  const canvasRef = useRef(null)
  const dataHistoryRef = useRef([])

  const k = (2 * PI) / wavelength
  const omega = 2 * PI * frequency

  useEffect(() => {
    let disp = 0
    switch (waveType) {
      case 'transverse':
      case 'longitudinal':
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
    dataHistoryRef.current = [...dataHistoryRef.current.slice(-100), { t: time, y: disp }]
  }, [time, amplitude, frequency, wavelength, waveType, k, omega])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 30

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const y = padding + (height - 2 * padding) * i / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    if (mode === 'displacementPosition') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Displacement vs Position', padding + 5, 18)

      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth = 2
      ctx.beginPath()

      for (let px = padding; px < width - padding; px++) {
        const x = ((px - padding) / (width - 2 * padding) - 0.5) * 8
        let y = 0

        switch (waveType) {
          case 'transverse':
          case 'longitudinal':
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
        const screenY = height / 2 - (y / (maxAmp || 1)) * (height / 2 - padding)

        if (px === padding) {
          ctx.moveTo(px, screenY)
        } else {
          ctx.lineTo(px, screenY)
        }
      }
      ctx.stroke()

      ctx.fillStyle = '#888'
      ctx.fillText('x →', width - padding - 15, height - 5)
      ctx.fillText('y →', padding, padding - 10)
    }

    if (mode === 'displacementTime') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Displacement vs Time (x=0)', padding + 5, 18)

      const data = dataHistoryRef.current
      if (data.length > 1) {
        const tMin = data[0].t
        const tMax = data[data.length - 1].t
        const tRange = Math.max(tMax - tMin, 0.001)

        ctx.strokeStyle = '#ff8800'
        ctx.lineWidth = 2
        ctx.beginPath()

        data.forEach((point, i) => {
          const px = padding + ((point.t - tMin) / tRange) * (width - 2 * padding)
          const maxAmp = waveType === 'standing' ? 2 * amplitude : 2 * amplitude
          const py = height / 2 - (point.y / (maxAmp || 1)) * (height / 2 - padding)
          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        })
        ctx.stroke()
      }

      ctx.fillStyle = '#888'
      ctx.fillText('t →', width - padding - 15, height - 5)
      ctx.fillText('y →', padding, padding - 10)
    }
  }, [time, amplitude, frequency, wavelength, waveType, mode, k, omega])

  return (
    <div style={{
      backgroundColor: '#0a0a0f',
      border: '1px solid #333',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      <canvas ref={canvasRef} width={280} height={160} />
    </div>
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
    params: createLabelTexture(`A=${amplitude.toFixed(2)}m f=${frequency.toFixed(1)}Hz λ=${wavelength.toFixed(1)}m v=${waveSpeed}m/s`, '#ffff00'),
    type: createLabelTexture(`Type: ${waveType.toUpperCase()}`, '#ff88ff'),
  }), [waveEquation, waveSpeed, amplitude, frequency, wavelength, waveType])

  useEffect(() => {
    if (Date.now() - lastDataTime < 50) return

    const x0 = 0
    const xHalf = wavelength / 2

    let dispX0 = 0, dispXHalf = 0, energy = 0

    switch (waveType) {
      case 'transverse':
      case 'longitudinal': {
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

export default function WaveMotion({
  amplitude = 0.5,
  frequency = 1,
  wavelength = 2,
  waveSpeed: providedSpeed,
  waveType = 'transverse',
  isPlaying = false,
  onDataPoint,
}) {
  const [time, setTime] = useState(0)
  const [lastDataTime, setLastDataTime] = useState(0)
  const [graphMode, setGraphMode] = useState('displacementPosition')
  const startTimeRef = useRef(0)
  const animationRef = useRef(null)

  const k = (2 * PI) / wavelength
  const omega = 2 * PI * frequency
  const waveSpeed = providedSpeed || (omega / k).toFixed(2)

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
        onCreated={(state) => {
          if (!state.gl?.getContext) return;
          try {
            const gl = state.gl.getContext('webgl2') || state.gl.getContext('webgl');
            if (gl && gl.canvas) {
              gl.canvas.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                console.warn('WebGL context lost');
              });
              gl.canvas.addEventListener('webglcontextrestored', () => {
                console.warn('WebGL context restored');
              });
            }
          } catch (e) {
            console.warn('WebGL initialization warning:', e.message);
          }
        }}
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
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

      <div className="absolute bottom-20 right-4">
        <div className="mb-2 font-mono-display text-xs text-slate-400">
          GRAPH: {graphMode === 'displacementPosition' ? 'Displacement vs Position' : 'Displacement vs Time'}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setGraphMode('displacementPosition')}
              className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
                graphMode === 'displacementPosition'
                  ? 'bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                  : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
              }`}
            >
              y vs x
            </button>
            <button
              onClick={() => setGraphMode('displacementTime')}
              className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
                graphMode === 'displacementTime'
                  ? 'bg-[rgba(255,136,0,0.2)] text-[#ff8800]'
                  : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
              }`}
            >
              y vs t
            </button>
          </div>
          <GraphPanel
            mode={graphMode}
            amplitude={amplitude}
            frequency={frequency}
            wavelength={wavelength}
            time={time}
            waveType={waveType}
          />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
        <div className="font-mono-display text-xs text-slate-400">TYPE:</div>
        {['transverse', 'longitudinal', 'standing', 'interference'].map(type => (
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

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <div className="rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
          <div className="mb-2 font-mono-display text-xs text-slate-400">LIVE DATA</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
            <span className="text-[#00f5ff]">A:</span>
            <span className="text-white">{amplitude.toFixed(2)} m</span>
            <span className="text-[#ff8800]">f:</span>
            <span className="text-white">{frequency.toFixed(1)} Hz</span>
            <span className="text-[#88ff88]">λ:</span>
            <span className="text-white">{wavelength.toFixed(1)} m</span>
            <span className="text-[#ff88ff]">v:</span>
            <span className="text-white">{waveSpeed} m/s</span>
            <span className="text-[#ffff00]">T:</span>
            <span className="text-white">{(1 / frequency).toFixed(3)} s</span>
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(255,136,0,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
          <div className="mb-2 font-mono-display text-xs text-[#ff8800]">EQUATION</div>
          <div className="font-mono-display text-[10px] text-white">
            {waveType === 'transverse' && `y = ${amplitude}·sin(${k.toFixed(2)}x - ${omega.toFixed(2)}t)`}
            {waveType === 'longitudinal' && `x = x₀ + ${amplitude}·sin(${k.toFixed(2)}x₀ - ${omega.toFixed(2)}t)`}
            {waveType === 'standing' && `y = ${(2*amplitude).toFixed(2)}·cos(${k.toFixed(2)}x)·sin(${omega.toFixed(2)}t)`}
            {waveType === 'interference' && `y = A·sin(kd₁-ωt) + A·sin(kd₂-ωt)`}
          </div>
        </div>
      </div>

      {waveType === 'standing' && (
        <div className="absolute left-4 top-4 rounded-lg border border-[rgba(255,0,255,0.5)] bg-[rgba(0,0,0,0.7)] p-2 font-mono-display text-xs text-[#ff00ff]">
          Red spheres = Nodes (zero displacement)
        </div>
      )}

      {waveType === 'interference' && (
        <div className="absolute left-4 top-4 rounded-lg border border-[rgba(255,255,0,0.5)] bg-[rgba(0,0,0,0.7)] p-2 font-mono-display text-xs text-[#ffff00]">
          Yellow sources | Bright = constructive | Dark = destructive
        </div>
      )}

      <div className="absolute bottom-4 right-4 rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00f5ff]">
        k = {k.toFixed(2)} rad/m | ω = {omega.toFixed(2)} rad/s
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
