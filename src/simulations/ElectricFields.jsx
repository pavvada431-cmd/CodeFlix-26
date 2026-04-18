import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Grid, Html, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { FrostedLabel, GlowTrail } from './shared/SimulationPrimitives'

const K_COULOMB = 8.99e9
const SCALE = 1e-6
const GRID_SIZE = 50
const FIELD_LINE_COUNT = 12
const FIELD_LINE_STEPS = 200
const FIELD_LINE_DS = 0.1

function calculateElectricField(charges, x, y) {
  let Ex = 0, Ey = 0
  charges.forEach(charge => {
    const dx = x - charge.x
    const dy = y - charge.y
    const r2 = dx * dx + dy * dy
    const r = Math.sqrt(r2)
    if (r < 0.1) return
    const E = K_COULOMB * charge.q / r2
    Ex += E * dx / r
    Ey += E * dy / r
  })
  return { Ex, Ey }
}

function calculatePotential(charges, x, y) {
  let V = 0
  charges.forEach(charge => {
    const dx = x - charge.x
    const dy = y - charge.y
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r < 0.05) return
    V += K_COULOMB * charge.q / r
  })
  return V
}

function traceFieldLineRK4(startX, startY, charges, direction) {
  const points = [{ x: startX, y: startY }]
  let x = startX, y = startY
  const dt = FIELD_LINE_DS

  for (let step = 0; step < FIELD_LINE_STEPS; step++) {
    const field1 = calculateElectricField(charges, x, y)
    const E1 = Math.sqrt(field1.Ex * field1.Ex + field1.Ey * field1.Ey)
    if (E1 < 1e-8) break
    
    const k1x = (field1.Ex / E1) * direction
    const k1y = (field1.Ey / E1) * direction
    
    const field2 = calculateElectricField(charges, x + k1x * dt * 0.5, y + k1y * dt * 0.5)
    const E2 = Math.sqrt(field2.Ex * field2.Ex + field2.Ey * field2.Ey)
    const k2x = (field2.Ex / (E2 || 1e-8)) * direction
    const k2y = (field2.Ey / (E2 || 1e-8)) * direction
    
    const field3 = calculateElectricField(charges, x + k2x * dt * 0.5, y + k2y * dt * 0.5)
    const E3 = Math.sqrt(field3.Ex * field3.Ex + field3.Ey * field3.Ey)
    const k3x = (field3.Ex / (E3 || 1e-8)) * direction
    const k3y = (field3.Ey / (E3 || 1e-8)) * direction
    
    const field4 = calculateElectricField(charges, x + k3x * dt, y + k3y * dt)
    const E4 = Math.sqrt(field4.Ex * field4.Ex + field4.Ey * field4.Ey)
    const k4x = (field4.Ex / (E4 || 1e-8)) * direction
    const k4y = (field4.Ey / (E4 || 1e-8)) * direction
    
    x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x)
    y += (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y)
    
    let hitCharge = false
    charges.forEach(charge => {
      const dist = Math.sqrt((x - charge.x) ** 2 + (y - charge.y) ** 2)
      if (dist < 0.05) {
        hitCharge = true
      }
    })
    
    if (hitCharge) break
    if (Math.abs(x) > 10 || Math.abs(y) > 10) break
    
    points.push({ x, y })
  }
  
  return points
}

function marchingSquares(charges, gridSize, bounds) {
  const cellSize = (bounds.max - bounds.min) / gridSize
  const values = []

  for (let i = 0; i < gridSize; i++) {
    values[i] = []
    for (let j = 0; j < gridSize; j++) {
      const x = bounds.min + i * cellSize
      const y = bounds.min + j * cellSize
      values[i][j] = calculatePotential(charges, x, y)
    }
  }

  const contours = []
  const numContours = 10
  const minVal = -1e8
  const maxVal = 1e8

  for (let c = 0; c < numContours; c++) {
    const targetValue = minVal + (maxVal - minVal) * (c / numContours) + (maxVal - minVal) / (2 * numContours)
    const contour = []

    for (let i = 0; i < gridSize - 1; i++) {
      for (let j = 0; j < gridSize - 1; j++) {
        const x = bounds.min + i * cellSize
        const y = bounds.min + j * cellSize

        const v00 = values[i][j]
        const v10 = values[i + 1][j]
        const v01 = values[i][j + 1]
        const v11 = values[i + 1][j + 1]

        const threshold = targetValue

        if ((v00 < threshold) !== (v10 < threshold)) {
          const t = (threshold - v00) / (v10 - v00)
          contour.push({ x: x + t * cellSize, y })
        }
        if ((v10 < threshold) !== (v11 < threshold)) {
          const t = (threshold - v10) / (v11 - v10)
          contour.push({ x: x + cellSize, y: y + t * cellSize })
        }
        if ((v01 < threshold) !== (v11 < threshold)) {
          const t = (threshold - v01) / (v11 - v01)
          contour.push({ x: x + t * cellSize, y: y + cellSize })
        }
        if ((v00 < threshold) !== (v01 < threshold)) {
          const t = (threshold - v00) / (v01 - v00)
          contour.push({ x, y: y + t * cellSize })
        }
      }
    }

    if (contour.length > 4) {
      contours.push({ value: targetValue, points: contour })
    }
  }

  return contours
}

function Charge({ position, q, onDrag }) {
  const meshRef = useRef()
  const [isDragging, setIsDragging] = useState(false)

  const size = Math.abs(q) * 0.5 + 0.2
  const color = q > 0 ? '#ff4444' : '#4488ff'
  const emissive = q > 0 ? '#ff0000' : '#0066ff'

  useFrame(() => {
    if (meshRef.current?.position && !isDragging) {
      meshRef.current.position.x = position.x
      meshRef.current.position.z = position.y
    }
  })

  useEffect(() => {
    document.body.style.cursor = isDragging ? 'grabbing' : 'crosshair'
    return () => {
      document.body.style.cursor = ''
    }
  }, [isDragging])

  return (
    <mesh
      ref={meshRef}
      position={[position.x, 0, position.y]}
      onPointerDown={(e) => {
        e.stopPropagation()
        setIsDragging(true)
      }}
      onPointerUp={() => {
        setIsDragging(false)
      }}
      onPointerMove={(e) => {
        if (isDragging) {
          const x = (e.point.x / 5) * 2
          const y = (e.point.z / 5) * 2
          onDrag?.({ x: Math.max(-4, Math.min(4, x)), y: Math.max(-4, Math.min(4, y)) })
        }
      }}
    >
      <sphereGeometry args={[size, 32, 32]} />
      <meshPhysicalMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={1.5}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  )
}

function FieldLines({ charges }) {
  const lines = useMemo(() => {
    const allLines = []

    charges.forEach(charge => {
      const numLines = FIELD_LINE_COUNT
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2
        const startR = 0.5
        const startX = charge.x + Math.cos(angle) * startR
        const startY = charge.y + Math.sin(angle) * startR
        const direction = charge.q > 0 ? 1 : -1
        const points = traceFieldLineRK4(startX, startY, charges, direction)
        if (points.length > 2) {
          allLines.push(points)
        }
      }
    })

    return allLines
  }, [charges])

  return (
    <group>
      {lines.map((points, idx) => (
        <line key={idx}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, 0, p.y]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffff00" transparent opacity={0.4} />
        </line>
      ))}
    </group>
  )
}

function EquipotentialContours({ charges }) {
  const contours = useMemo(() => {
    const bounds = { min: -5, max: 5 }
    return marchingSquares(charges, GRID_SIZE, bounds)
  }, [charges])

  return (
    <group>
      {contours.map((contour, idx) => (
        <line key={idx}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={contour.points.length}
              array={new Float32Array(contour.points.flatMap(p => [p.x, 0.01, p.y]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffff00" transparent opacity={0.3} linewidth={1} />
        </line>
      ))}
    </group>
  )
}

function ForceArrows({ charges }) {
  const arrows = useMemo(() => {
    const result = []
    for (let i = 0; i < charges.length; i++) {
      for (let j = i + 1; j < charges.length; j++) {
        const c1 = charges[i]
        const c2 = charges[j]
        const dx = c2.x - c1.x
        const dy = c2.y - c1.y
        const r = Math.sqrt(dx * dx + dy * dy)
        const F = K_COULOMB * Math.abs(c1.q * c2.q) / (r * r)
        const dirX = dx / r
        const dirY = dy / r
        const midX = (c1.x + c2.x) / 2
        const midY = (c1.y + c2.y) / 2
        result.push({
          x: midX,
          y: midY,
          dx: dirX * Math.sign(c1.q * c2.q) * 0.5,
          dy: dirY * Math.sign(c1.q * c2.q) * 0.5,
          F,
          repulsion: c1.q * c2.q > 0,
        })
      }
    }
    return result
  }, [charges])

  return (
    <group>
      {arrows.map((arrow, idx) => (
        <group key={idx} position={[arrow.x, 0.3, arrow.y]}>
          <mesh
            rotation={[0, Math.atan2(arrow.dy, arrow.dx) + Math.PI / 2, 0]}
            position={[arrow.dx * 0.5, 0, arrow.dy * 0.5]}
          >
            <coneGeometry args={[0.05, 0.15, 8]} />
            <meshPhysicalMaterial color={arrow.repulsion ? '#ff4444' : '#44ff44'} />
          </mesh>
          <mesh
            rotation={[0, Math.atan2(arrow.dy, arrow.dx) + Math.PI / 2, 0]}
            position={[0, 0, 0]}
          >
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshPhysicalMaterial color={arrow.repulsion ? '#ff4444' : '#44ff44'} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function TestCharge({ charges, isActive, onPositionUpdate }) {
  const positionRef = useRef({ x: 1, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const meshRef = useRef()
  const trailRef = useRef([])
  const trailMeshRef = useRef()

  useEffect(() => {
    if (!isActive) {
      positionRef.current = { x: 1, y: 0 }
      velocityRef.current = { x: 0, y: 0 }
      trailRef.current = []
    }
  }, [isActive])

  useFrame(() => {
    if (!isActive || !meshRef.current) return

    const dt = 0.016
    const q = 0.001 * 1e-6
    const m = 1e-10

    if (positionRef.current && velocityRef.current) {
      const { Ex, Ey } = calculateElectricField(charges, positionRef.current.x, positionRef.current.y)
      const ax = q * Ex / m
      const ay = q * Ey / m

      velocityRef.current.x += ax * dt * 0.01
      velocityRef.current.y += ay * dt * 0.01

      const damping = 0.98
      velocityRef.current.x *= damping
      velocityRef.current.y *= damping

      positionRef.current.x += velocityRef.current.x * dt
      positionRef.current.y += velocityRef.current.y * dt

      if (meshRef.current?.position) {
        meshRef.current.position.x = positionRef.current.x
        meshRef.current.position.z = positionRef.current.y
      }

      if (trailRef.current) {
        trailRef.current = [...trailRef.current.slice(-99), { x: positionRef.current.x, y: positionRef.current.y }]
        if (trailMeshRef.current?.geometry && trailRef.current.length > 1) {
          const positions = new Float32Array(trailRef.current.flatMap(p => [p.x, 0, p.y]))
          trailMeshRef.current.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        }
      }

      onPositionUpdate?.(positionRef.current)
    }
  })

  if (!isActive) return null

  return (
    <group>
      <line ref={trailMeshRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#00ff00" transparent opacity={0.6} />
      </line>
      <mesh ref={meshRef} position={[1, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshPhysicalMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
      </mesh>
    </group>
  )
}

function GraphPanel({ mode, charges, dataHistory }) {
  const canvasRef = useRef(null)

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
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    if (mode === 'potential') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Electric Potential V along X-axis', padding + 5, 18)

      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth = 2
      ctx.beginPath()

      for (let px = padding; px < width - padding; px++) {
        const x = ((px - padding) / (width - 2 * padding) - 0.5) * 10
        const V = calculatePotential(charges, x, 0)
        const normalizedV = Math.max(-1, Math.min(1, V / 1e9))
        const py = height / 2 - normalizedV * (height / 2 - padding)

        if (px === padding) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()

      ctx.fillStyle = '#888'
      ctx.fillText('V →', width - padding - 20, height - 5)
      ctx.fillText('x →', width - padding - 20, height - 15)
    }

    if (mode === 'forceDistance') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Force vs Distance (1/r² relationship)', padding + 5, 18)

      const q1 = charges[0]?.q || 1
      const q2 = charges[1]?.q || 1

      ctx.strokeStyle = '#ff6b35'
      ctx.lineWidth = 2
      ctx.beginPath()

      for (let i = 0; i < 100; i++) {
        const r = 0.5 + i * 0.1
        const F = K_COULOMB * Math.abs(q1 * q2) / (r * r) * 1e12
        const x = padding + (i / 99) * (width - 2 * padding)
        const y = height - padding - Math.min(F, 100) / 100 * (height - 2 * padding)

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      ctx.fillStyle = '#888'
      ctx.fillText('F →', width - padding - 20, height - 5)
      ctx.fillText('r →', width - padding - 20, height - 15)
      ctx.fillText('F ∝ 1/r²', width / 2 - 20, 35)
    }
  }, [charges, dataHistory, mode])

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

export default function ElectricFields({
  charges: initialCharges = [{ x: -1, y: 0, q: 1e-6 }, { x: 1, y: 0, q: -1e-6 }],
  isPlaying = false,
  onDataPoint,
}) {
  const [charges, setCharges] = useState(initialCharges)
  const [showEquipotentials, setShowEquipotentials] = useState(true)
  const [showFieldLines, setShowFieldLines] = useState(true)
  const [testChargeActive, setTestChargeActive] = useState(false)
  const [testChargePosition, setTestChargePosition] = useState({ x: 0, y: 0 })
  const [graphMode, setGraphMode] = useState('potential')

  const potentialEnergy = useMemo(() => {
    let U = 0
    for (let i = 0; i < charges.length; i++) {
      for (let j = i + 1; j < charges.length; j++) {
        const dx = charges[j].x - charges[i].x
        const dy = charges[j].y - charges[i].y
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r < 0.01) continue
        U += K_COULOMB * charges[i].q * charges[j].q / r
      }
    }
    return U
  }, [charges])

  const handleCanvasClick = useCallback((event) => {
    if (charges.length >= 6) return
    const pointX = event?.point?.x ?? 0
    const pointY = event?.point?.z ?? 0
    const worldX = (pointX / 5) * 2
    const worldY = (pointY / 5) * 2

    if (event.button === 2) {
      setCharges(prev => [...prev, { x: worldX, y: worldY, q: -1e-6 }])
    } else {
      setCharges(prev => [...prev, { x: worldX, y: worldY, q: 1e-6 }])
    }
  }, [charges])

  const handleChargeDrag = useCallback((index, newPos) => {
    setCharges(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...newPos }
      return updated
    })
  }, [])

  const removeCharge = useCallback((index) => {
    setCharges(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearCharges = useCallback(() => {
    setCharges([])
    setTestChargeActive(false)
  }, [])

  useEffect(() => {
    if (!onDataPoint) return
    const { Ex, Ey } = calculateElectricField(charges, testChargePosition.x, testChargePosition.y)
    const fieldMagnitude = Math.sqrt(Ex * Ex + Ey * Ey)
    const testChargeC = 1e-6
    const force = {
      Fx_N: testChargeC * Ex,
      Fy_N: testChargeC * Ey,
      magnitude_N: Math.abs(testChargeC) * fieldMagnitude,
    }
    const equipotentialSamples = [
      { x: -1, y: 0, V: calculatePotential(charges, -1, 0) },
      { x: 0, y: 0, V: calculatePotential(charges, 0, 0) },
      { x: 1, y: 0, V: calculatePotential(charges, 1, 0) },
    ]
    onDataPoint({
      t_s: performance.now() / 1000,
      t: performance.now() / 1000,
      numCharges: charges.length,
      potentialEnergy_J: potentialEnergy,
      testChargePos_m: testChargePosition,
      electricFieldAtTest_NpC: { Ex, Ey, magnitude: fieldMagnitude },
      field_magnitude_NC: fieldMagnitude,
      testChargeForce_N: force,
      force_N: force.magnitude_N,
      equipotentialSamples_V: equipotentialSamples,
      potential_V: calculatePotential(charges, testChargePosition.x, testChargePosition.y),
      fieldLineDirection: 'away from +q toward -q',
      potentialEnergy,
      testChargePos: testChargePosition,
    })
  }, [charges, potentialEnergy, testChargePosition, onDataPoint])

  return (
    <div className="relative h-full w-full">
      <Canvas
        onCreated={(state) => {
        try {
          state.gl.getContext("webgl2") || state.gl.getContext("webgl");
        } catch (e) {
          console.warn("WebGL initialization warning:", e);
        }
      }}
      camera={{ position: [0, 8, 0], fov: 50 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleCanvasClick}
      >
        <fog attach="fog" args={['#050a16', 8, 28]} />
        <Environment preset="night" intensity={0.2} />
        <ambientLight intensity={0.34} color="#9ab8e8" />
        <directionalLight position={[10, 10, 5]} intensity={1.15} />
        <pointLight position={[0, 4, 0]} intensity={0.7} color="#00f5ff" />
        <pointLight position={[0, 2, -6]} intensity={0.35} color="#22ffaa" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[15, 15]} />
          <meshPhysicalMaterial color="#0a0f1e" />
        </mesh>

        <Grid
          position={[0, -0.05, 0]}
          args={[15, 15]}
          cellSize={0.4}
          cellThickness={0.5}
          sectionSize={2}
          sectionThickness={1}
          cellColor="#22465f"
          sectionColor="#2f617d"
          fadeDistance={18}
          fadeStrength={1}
        />

        {showFieldLines && <FieldLines charges={charges} />}
        {showEquipotentials && <EquipotentialContours charges={charges} />}
        <ForceArrows charges={charges} />

        {charges.map((charge, idx) => (
          <group key={idx}>
            <Charge
              position={charge}
              q={charge.q}
              onDrag={(newPos) => handleChargeDrag(idx, newPos)}
            />
          </group>
        ))}

        <TestCharge
          charges={charges}
          isActive={testChargeActive}
          onPositionUpdate={setTestChargePosition}
        />

        {charges.length > 0 && (
          <FrostedLabel position={[0, 3, 0]} color="#ff88ff">
            {`U = ${potentialEnergy.toExponential(2)} J`}
          </FrostedLabel>
        )}
        <EffectComposer>
          <Bloom intensity={0.44} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette offset={0.25} darkness={0.45} />
        </EffectComposer>
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={20}
          autoRotate={!isPlaying}
          autoRotateSpeed={0.14}
        />
      </Canvas>

      <div className="absolute right-4 top-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
        <div className="mb-2 font-mono-display text-xs text-slate-400">CHARGES ({charges.length}/6)</div>
        {charges.map((charge, idx) => (
          <div key={idx} className="mb-1 flex items-center gap-2 font-mono-display text-[10px]">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: charge.q > 0 ? '#ff4444' : '#4488ff' }}
            />
            <span className="text-white">
              q{idx + 1} = {(charge.q * 1e6).toFixed(1)} μC
            </span>
            <span className="text-slate-500">
              ({charge.x.toFixed(1)}, {charge.y.toFixed(1)})
            </span>
            <button
              onClick={() => removeCharge(idx)}
              className="ml-1 text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        ))}
        <div className="mt-2 border-t border-[#333] pt-2">
          <div className="font-mono-display text-[10px] text-slate-400">
            Potential Energy:
          </div>
          <div className="font-mono-display text-[10px] text-[#ff88ff]">
            U = {potentialEnergy.toExponential(2)} J
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 right-4">
        <div className="mb-2 font-mono-display text-xs text-slate-400">
          GRAPH: {graphMode === 'potential' ? 'V along X-axis' : 'F vs Distance'}
        </div>
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setGraphMode('potential')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'potential'
                ? 'bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            V vs x
          </button>
          <button
            onClick={() => setGraphMode('forceDistance')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'forceDistance'
                ? 'bg-[rgba(255,107,53,0.2)] text-[#ff6b35]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            F vs r
          </button>
        </div>
        <GraphPanel mode={graphMode} charges={charges} dataHistory={[]} />
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <button
          onClick={() => setShowFieldLines(!showFieldLines)}
          className={`rounded px-4 py-2 font-mono-display text-xs transition ${
            showFieldLines
              ? 'border-[rgba(255,255,0,0.5)] bg-[rgba(255,255,0,0.2)] text-[#ffff00]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
          }`}
          style={{ borderWidth: '1px', borderStyle: 'solid' }}
        >
          Field Lines {showFieldLines ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => setShowEquipotentials(!showEquipotentials)}
          className={`rounded px-4 py-2 font-mono-display text-xs transition ${
            showEquipotentials
              ? 'border-[rgba(255,200,0,0.5)] bg-[rgba(255,200,0,0.2)] text-[#ffc800]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
          }`}
          style={{ borderWidth: '1px', borderStyle: 'solid' }}
        >
          Equipotentials {showEquipotentials ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => setTestChargeActive(!testChargeActive)}
          className={`rounded px-4 py-2 font-mono-display text-xs transition ${
            testChargeActive
              ? 'border-[rgba(0,255,0,0.5)] bg-[rgba(0,255,0,0.2)] text-[#00ff00]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
          }`}
          style={{ borderWidth: '1px', borderStyle: 'solid' }}
        >
          {testChargeActive ? 'Test Charge: ON' : 'Test Charge: OFF'}
        </button>

        <button
          onClick={clearCharges}
          className="rounded border border-[rgba(255,68,68,0.5)] bg-[rgba(255,68,68,0.15)] px-4 py-2 font-mono-display text-xs text-[#ff4444] hover:bg-[rgba(255,68,68,0.25)]"
        >
          Clear All
        </button>
      </div>

      <div className="absolute top-4 left-4 rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00f5ff]">
        Click: +charge | Right-click: -charge | Drag to move
      </div>

      <div className="absolute bottom-4 right-4 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.5)] p-2 font-mono-display text-[9px] text-slate-400">
        <div className="mb-1 text-slate-500">LEGEND:</div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-500" /> <span>Positive charge</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-blue-500" /> <span>Negative charge</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500" /> <span>Test charge</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-yellow-500 opacity-50" /> <span>Field lines</span></div>
      </div>
    </div>
  )
}

ElectricFields.getSceneConfig = (variables = {}) => {
  const { charges = [] } = variables

  let potentialEnergy = 0
  for (let i = 0; i < charges.length; i++) {
    for (let j = i + 1; j < charges.length; j++) {
      const dx = charges[j].x - charges[i].x
      const dy = charges[j].y - charges[i].y
      const r = Math.sqrt(dx * dx + dy * dy)
      if (r > 0.01) {
        potentialEnergy += K_COULOMB * charges[i].q * charges[j].q / r
      }
    }
  }

  return {
    name: 'Electric Fields',
    description: 'Coulomb force and electric field visualization',
    type: 'electric_fields',
    physics: {
      charges,
      potentialEnergy,
      coulombConstant: K_COULOMB,
    },
    calculations: {
      coulombForce: `F = kq₁q₂/r²`,
      electricField: `E = kq/r²`,
      fieldDirection: `Field lines point away from +q and toward -q`,
      potentialEnergy: `U = Σ kqᵢqⱼ/rᵢⱼ = ${potentialEnergy.toExponential(2)} J`,
    },
  }
}
