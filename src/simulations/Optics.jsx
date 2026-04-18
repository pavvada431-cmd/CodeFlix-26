import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Grid, Html, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

const SCENE_SCALE = 2

function FrostedLabel({ position, color = '#00f5ff', children }) {
  return (
    <Html position={position} center distanceFactor={10} zIndexRange={[100, 0]}>
      <div
        style={{
          background: 'rgba(10, 15, 30, 0.86)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${color}40`,
          borderRadius: '8px',
          padding: '4px 10px',
          color,
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 700,
          boxShadow: `0 4px 18px ${color}25`,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
    </Html>
  )
}

function lensEquation(f, u) {
  if (Math.abs(f) < 0.001 || Math.abs(u) < 0.001) return Infinity
  return 1 / (1 / f - 1 / u)
}

function magnification(f, u) {
  const v = lensEquation(f, u)
  if (!isFinite(v)) return 0
  return -v / u
}

function signedFocalLength(lensType, focalLength) {
  return lensType === 'concave' ? -Math.abs(focalLength) : Math.abs(focalLength)
}

function createLensGeometry(type, width, height) {
  const shape = new THREE.Shape()
  const halfW = width / 2
  const halfH = height / 2

  if (type === 'convex') {
    shape.moveTo(0, -halfH)
    shape.bezierCurveTo(halfW * 0.3, -halfH * 0.8, halfW, -halfH * 0.3, halfW, 0)
    shape.bezierCurveTo(halfW, halfH * 0.3, halfW * 0.3, halfH * 0.8, 0, halfH)
    shape.lineTo(-halfW, halfH)
    shape.bezierCurveTo(-halfW * 0.3, halfH * 0.8, -halfW, halfH * 0.3, -halfW, 0)
    shape.bezierCurveTo(-halfW, -halfH * 0.3, -halfW * 0.3, -halfH * 0.8, 0, -halfH)
  } else if (type === 'concave') {
    shape.moveTo(0, -halfH)
    shape.lineTo(halfW, -halfH)
    shape.bezierCurveTo(halfW, -halfH * 0.2, halfW * 0.3, halfH * 0.2, halfW, halfH)
    shape.lineTo(-halfW, halfH)
    shape.bezierCurveTo(-halfW, -halfH * 0.2, -halfW * 0.3, halfH * 0.2, -halfW, -halfH)
    shape.lineTo(0, -halfH)
  } else {
    shape.moveTo(0, -halfH)
    shape.lineTo(halfW, -halfH)
    shape.lineTo(halfW, halfH)
    shape.lineTo(0, halfH)
    shape.bezierCurveTo(-halfW * 0.3, halfH * 0.8, -halfW, halfH * 0.3, -halfW, 0)
    shape.bezierCurveTo(-halfW, -halfH * 0.3, -halfW * 0.3, -halfH * 0.8, 0, -halfH)
  }

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: false,
  })
}

function createMirrorGeometry(type, width, height) {
  const shape = new THREE.Shape()
  const halfW = width / 2
  const halfH = height / 2

  if (type === 'parabolic') {
    shape.moveTo(-halfW, halfH)
    shape.quadraticCurveTo(0, 0, halfW, halfH)
    shape.lineTo(halfW, -halfH)
    shape.lineTo(-halfW, -halfH)
    shape.closePath()
  } else {
    shape.moveTo(-halfW, halfH)
    shape.lineTo(halfW, halfH)
    shape.lineTo(halfW, -halfH)
    shape.lineTo(-halfW, -halfH)
    shape.closePath()
  }

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: false,
  })
}

function OpticalAxis({ width }) {
  const points = []
  for (let i = -width; i <= width; i += 0.2) {
    points.push(new THREE.Vector3(i, 0, 0))
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineDashedMaterial color="#444" dashSize={0.1} gapSize={0.1} />
    </line>
  )
}

function FocalPoints({ focalLength }) {
  return (
    <group>
      <mesh position={[-focalLength * SCENE_SCALE, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshPhysicalMaterial color="#ff4444" />
      </mesh>
      <mesh position={[focalLength * SCENE_SCALE, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshPhysicalMaterial color="#ff4444" />
      </mesh>
    </group>
  )
}

function Lens({ type }) {
  const height = 4
  const width = 0.15

  const geometry = useMemo(() => createLensGeometry(type, width, height), [type])

  return (
    <group>
      <mesh geometry={geometry} rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          color={type === 'concave' ? '#4488ff' : '#88ccff'}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color="#4488cc" />
      </lineSegments>
    </group>
  )
}

function Mirror({ type }) {
  const height = 4
  const width = 0.2

  const geometry = useMemo(() => createMirrorGeometry(type, width, height), [type])

  return (
    <group>
      <mesh geometry={geometry} rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        <meshPhysicalMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Arrow({ from, to, color }) {
  const length = useMemo(() => {
    return Math.sqrt(
      (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2
    )
  }, [from, to])

  const angle = useMemo(() => Math.atan2(to[1] - from[1], to[0] - from[0]), [from, to])

  return (
    <group>
      <mesh
        position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0]}
        rotation={[0, 0, angle]}
      >
        <cylinderGeometry args={[0.02, 0.02, length, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh
        position={[to[0], to[1], to[2]]}
        rotation={[0, 0, angle - Math.PI / 2]}
      >
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

function PrincipalRays({
  objectPos,
  objectHeight,
  focalLength,
  lensType,
  isPlaying,
  animationProgress,
  mode,
}) {
  const u = objectPos.x
  const f = focalLength * SCENE_SCALE
  const isMirror = mode === 'mirror'

  const v = lensEquation(f / SCENE_SCALE, u) * SCENE_SCALE
  const m = magnification(f / SCENE_SCALE, u)
  const imageHeight = objectHeight * Math.abs(m)
  const imageInverted = m < 0
  const imageReal = !isMirror && v > 0

  const objectTip = [objectPos.x, objectHeight / 2, 0]

  const rays = []
  const maxDrawLength = isPlaying ? animationProgress : 1

  if (lensType === 'convex' || (isMirror && lensType === 'convex')) {
    const f1 = isMirror ? -f : -f
    const ray1End = Math.min(maxDrawLength * 10, f1)
    rays.push({
      from: objectTip,
      to: [ray1End, 0, 0],
      color: '#ff8800',
    })

    if (Math.abs(f) > 0.01) {
      const ray2End = Math.min(maxDrawLength * 10, 2 * f)
      rays.push({
        from: objectTip,
        to: [ray2End, objectHeight / 2 * maxDrawLength, 0],
        color: '#00ff88',
      })

      rays.push({
        from: objectTip,
        to: [f, objectHeight / 2 * maxDrawLength, 0],
        color: '#4488ff',
      })
    }
  } else if (lensType === 'concave') {
    const ray1End = -maxDrawLength * 2
    rays.push({
      from: objectTip,
      to: [ray1End, 0, 0],
      color: '#ff8800',
    })

    rays.push({
      from: objectTip,
      to: [f, objectHeight / 2 * maxDrawLength, 0],
      color: '#4488ff',
    })
  }

  return { rays, v, m, imageHeight, imageInverted, imageReal }
}

function ObjectArrow({ position, height, color }) {
  return (
    <group>
      <mesh position={[position.x, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, height, 8]} />
        <meshPhysicalMaterial color={color} />
      </mesh>
      <mesh position={[position.x, height / 2, 0]}>
        <coneGeometry args={[0.08, 0.15, 8]} />
        <meshPhysicalMaterial color={color} />
      </mesh>
    </group>
  )
}

function ImageArrow({ position, height, inverted, color, real }) {
  const actualHeight = inverted ? -height : height
  return (
    <group>
      <mesh position={[position.x, actualHeight / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, Math.abs(height), 8]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={real ? 1 : 0.5}
        />
      </mesh>
      <mesh position={[position.x, actualHeight > 0 ? actualHeight : 0, 0]}>
        <coneGeometry args={[0.08, 0.15, 8]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={real ? 1 : 0.5}
        />
      </mesh>
      {inverted && (
        <mesh position={[position.x, actualHeight > 0 ? 0 : actualHeight, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.08, 0.15, 8]} />
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={real ? 1 : 0.5}
          />
        </mesh>
      )}
    </group>
  )
}

function DispersionRays({ objectPos, objectHeight, focalLength, animationProgress }) {
  const wavelengths = [
    { color: '#ff0000', name: 'R', f: focalLength * 1.1 },
    { color: '#ff8800', name: 'O', f: focalLength * 1.05 },
    { color: '#ffff00', name: 'Y', f: focalLength },
    { color: '#00ff00', name: 'G', f: focalLength * 0.95 },
    { color: '#00ffff', name: 'C', f: focalLength * 0.9 },
    { color: '#0000ff', name: 'B', f: focalLength * 0.85 },
    { color: '#8800ff', name: 'V', f: focalLength * 0.8 },
  ]

  const maxDraw = animationProgress

  return (
    <group>
      {wavelengths.map((wl, i) => (
        <group key={i}>
          <Arrow
            from={[objectPos.x, objectHeight / 2, 0]}
            to={[objectPos.x - maxDraw * 5, 0, 0]}
            color={wl.color}
          />
          <Arrow
            from={[objectPos.x - maxDraw * 5, 0, 0]}
            to={[-wl.f, objectHeight / 2 * maxDraw * 0.5, 0]}
            color={wl.color}
          />
        </group>
      ))}
    </group>
  )
}

function TotalInternalReflection() {
  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[8, 4]} />
        <meshPhysicalMaterial color="#4488cc" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[8, 4]} />
        <meshPhysicalMaterial color="#c0c0c0" metalness={0.9} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(8, 4)]} />
        <lineBasicMaterial color="#88aacc" />
      </lineSegments>

      <Arrow
        from={[-2, -1, 0]}
        to={[-1, 0, 0]}
        color="#ffffff"
      />

      <Arrow
        from={[-1, 0, 0]}
        to={[0, 0.7, 0]}
        color="#ffff00"
      />

      <Arrow
        from={[-1, 0, 0]}
        to={[1, -0.5, 0]}
        color="#ff4444"
      />
    </group>
  )
}

function GraphPanel({ mode, objectDistance, focalLength }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 35

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    if (mode === 'imageDistance') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Image Distance vs Object Distance', padding + 5, 18)

      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth = 2
      ctx.beginPath()

      for (let px = padding; px < width - padding; px++) {
        const u = ((px - padding) / (width - 2 * padding) - 0.5) * 20 + 5
        if (u < 0.1) continue
        const v = lensEquation(focalLength, u) * SCENE_SCALE
        if (!isFinite(v) || Math.abs(v) > 10) continue
        const x = padding + ((u - 0) / 20) * (width - 2 * padding)
        const y = height - padding - ((v + 5) / 15) * (height - 2 * padding)
        if (px === padding || !isFinite(y)) continue
        ctx.lineTo(x, Math.max(padding, Math.min(height - padding, y)))
      }
      ctx.stroke()

      ctx.fillStyle = '#888'
      ctx.fillText('u →', width - padding - 20, height - 5)
      ctx.fillText('v →', padding, padding - 10)
    }

    if (mode === 'magnification') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Magnification vs Object Distance', padding + 5, 18)

      ctx.strokeStyle = '#ff6b35'
      ctx.lineWidth = 2
      ctx.beginPath()

      for (let px = padding; px < width - padding; px++) {
        const u = ((px - padding) / (width - 2 * padding)) * 15 + 0.5
        if (u < 0.1) continue
        const m = magnification(focalLength, u)
        const x = padding + ((u - 0) / 15) * (width - 2 * padding)
        const y = height / 2 - m * 2
        if (px === padding) ctx.moveTo(x, Math.max(padding, Math.min(height - padding, y)))
        else ctx.lineTo(x, Math.max(padding, Math.min(height - padding, y)))
      }
      ctx.stroke()

      ctx.strokeStyle = '#333'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padding, height / 2)
      ctx.lineTo(width - padding, height / 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#888'
      ctx.fillText('u →', width - padding - 20, height - 5)
      ctx.fillText('m →', padding, padding - 10)
    }
  }, [mode, objectDistance, focalLength])

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

export default function Optics({
  lensType = 'convex',
  focalLength = 2,
  objectDistance = 4,
  objectHeight = 1,
  isPlaying = false,
  onDataPoint,
}) {
  const [mode, setMode] = useState('lens')
  const [graphMode, setGraphMode] = useState('imageDistance')
  const [animationProgress, setAnimationProgress] = useState(0)

  const u = objectDistance
  const f = signedFocalLength(lensType, focalLength)
  const v = lensEquation(f, u) * SCENE_SCALE
  const m = magnification(f, u)
  const imageHeight = objectHeight * Math.abs(m)
  const imageInverted = m < 0
  const imageReal = v > 0 && mode === 'lens'
  const imageVirtual = v < 0 && mode === 'lens'

  useEffect(() => {
    if (!isPlaying) {
      const timeoutId = setTimeout(() => {
        setAnimationProgress(0)
      }, 0)
      return () => clearTimeout(timeoutId)
    }

    const startTime = performance.now()
    const duration = 2000

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setAnimationProgress(progress)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isPlaying, objectDistance, focalLength, lensType, mode])

  useEffect(() => {
    if (onDataPoint) {
      onDataPoint({
        objectDistance_m: u,
        imageDistance_m: v / SCENE_SCALE,
        focalLength_m: f,
        magnification: m,
        signConvention: mode === 'lens' ? 'thin-lens Cartesian sign convention' : 'mirror sign convention',
        imageType: imageReal ? 'real' : imageVirtual ? 'virtual' : 'none',
        objectDistance: u,
        imageDistance: v / SCENE_SCALE,
      })
    }
  }, [u, v, m, imageReal, imageVirtual, onDataPoint, f, mode])

  const objectPos = { x: -u * SCENE_SCALE, y: 0 }

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
        camera={{ position: [0, 0, 12], fov: 60 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
      >
        <fog attach="fog" args={['#0a0f1e', 8, 26]} />
        <Environment preset="studio" intensity={0.18} />
        <ambientLight intensity={0.32} color="#b4c9e6" />
        <directionalLight position={[5, 6, 5]} intensity={0.95} color="#ffffff" />
        <pointLight position={[-5, 1.5, 2]} intensity={0.55} color="#00f5ff" />
        <pointLight position={[5, 1.5, -2]} intensity={0.45} color="#ffb366" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
          <planeGeometry args={[24, 8]} />
          <meshPhysicalMaterial color="#0b1220" metalness={0.55} roughness={0.28} clearcoat={0.6} />
        </mesh>
        <Grid
          position={[0, -2.18, 0]}
          args={[24, 8]}
          cellSize={0.4}
          cellThickness={0.5}
          sectionSize={2}
          sectionThickness={1}
          cellColor="#24384f"
          sectionColor="#3f5f84"
          fadeDistance={20}
          fadeStrength={1}
        />
        <mesh position={[0, -1.9, -0.2]}>
          <boxGeometry args={[20, 0.1, 0.8]} />
          <meshPhysicalMaterial color="#4a5e78" metalness={0.8} roughness={0.2} emissive="#79b1ff" emissiveIntensity={0.08} />
        </mesh>

        <OpticalAxis width={15} />

        {mode === 'lens' && <Lens type={lensType} />}
        {mode === 'mirror' && <Mirror type="parabolic" />}

        <FocalPoints focalLength={focalLength} />

        <ObjectArrow
          position={objectPos}
          height={objectHeight}
          color="#00ff88"
        />

        {mode === 'dispersion' && (
          <DispersionRays
            objectPos={objectPos}
            objectHeight={objectHeight}
            focalLength={focalLength}
            animationProgress={animationProgress}
          />
        )}

        {mode === 'totalReflection' && <TotalInternalReflection />}

        {mode !== 'dispersion' && mode !== 'totalReflection' && isFinite(v) && (
          <ImageArrow
            position={{ x: v, y: 0 }}
            height={imageHeight}
            inverted={imageInverted}
            color="#ff4444"
            real={imageReal}
          />
        )}

        <FrostedLabel position={[0, 4, 0]} color="#00f5ff">
          {`${lensType.toUpperCase()} | f=${f}m | u=${u}m | v=${(v / SCENE_SCALE).toFixed(2)}m | m=${m.toFixed(2)}`}
        </FrostedLabel>
        <EffectComposer>
          <Bloom intensity={0.38} luminanceThreshold={0.58} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette offset={0.25} darkness={0.45} />
        </EffectComposer>
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={7}
          maxDistance={20}
          autoRotate={!isPlaying}
          autoRotateSpeed={0.14}
        />
      </Canvas>

      <div className="absolute right-4 top-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
        <div className="mb-2 font-mono-display text-xs text-slate-400">OPTICS PARAMETERS</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
          <span className="text-[#00f5ff]">u:</span>
          <span className="text-white">{u.toFixed(2)} m</span>
          <span className="text-[#ff8800]">v:</span>
          <span className="text-white">{isFinite(v) ? (v / SCENE_SCALE).toFixed(2) : '∞'} m</span>
          <span className="text-[#ff4444]">m:</span>
          <span className="text-white">{m.toFixed(3)}</span>
          <span className="text-[#88ff88]">f:</span>
          <span className="text-white">{f.toFixed(2)} m</span>
          <span className="text-[#ff88ff]">Type:</span>
          <span className="text-white">
            {imageReal ? 'Real' : imageVirtual ? 'Virtual' : 'None'}
          </span>
        </div>
      </div>

      <div className="absolute bottom-20 right-4">
        <div className="mb-2 font-mono-display text-xs text-slate-400">
          GRAPH: {graphMode === 'imageDistance' ? 'v vs u' : 'm vs u'}
        </div>
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setGraphMode('imageDistance')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'imageDistance'
                ? 'bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            v vs u
          </button>
          <button
            onClick={() => setGraphMode('magnification')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'magnification'
                ? 'bg-[rgba(255,107,53,0.2)] text-[#ff6b35]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            m vs u
          </button>
        </div>
        <GraphPanel mode={graphMode} objectDistance={objectDistance} focalLength={focalLength} />
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="font-mono-display text-xs text-slate-400">LENS TYPE</div>
        <div className="flex gap-1">
          {['convex', 'concave', 'plano-convex'].map(type => (
            <button
              key={type}
              onClick={() => setMode('lens') || (lensType === type)}
              className={`rounded px-3 py-1.5 font-mono-display text-[10px] transition ${
                lensType === type && mode === 'lens'
                  ? 'border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                  : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
              }`}
              style={{ borderWidth: '1px', borderStyle: 'solid' }}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="font-mono-display text-xs text-slate-400">MODE</div>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('lens')}
            className={`rounded px-3 py-1.5 font-mono-display text-[10px] transition ${
              mode === 'lens'
                ? 'border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
            }`}
            style={{ borderWidth: '1px', borderStyle: 'solid' }}
          >
            Lens
          </button>
          <button
            onClick={() => setMode('mirror')}
            className={`rounded px-3 py-1.5 font-mono-display text-[10px] transition ${
              mode === 'mirror'
                ? 'border-[rgba(192,192,192,0.5)] bg-[rgba(192,192,192,0.2)] text-[#c0c0c0]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
            }`}
            style={{ borderWidth: '1px', borderStyle: 'solid' }}
          >
            Mirror
          </button>
          <button
            onClick={() => setMode('dispersion')}
            className={`rounded px-3 py-1.5 font-mono-display text-[10px] transition ${
              mode === 'dispersion'
                ? 'border-[rgba(255,255,0,0.5)] bg-[rgba(255,255,0,0.2)] text-[#ffff00]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
            }`}
            style={{ borderWidth: '1px', borderStyle: 'solid' }}
          >
            Dispersion
          </button>
          <button
            onClick={() => setMode('totalReflection')}
            className={`rounded px-3 py-1.5 font-mono-display text-[10px] transition ${
              mode === 'totalReflection'
                ? 'border-[rgba(255,68,68,0.5)] bg-[rgba(255,68,68,0.2)] text-[#ff4444]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
            }`}
            style={{ borderWidth: '1px', borderStyle: 'solid' }}
          >
            TIR
          </button>
        </div>
      </div>

      <div className="absolute top-4 left-4 rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00f5ff]">
        {mode === 'lens' && `Thin Lens: 1/v = 1/f - 1/u`}
        {mode === 'mirror' && `Mirror: 1/v + 1/u = 1/f`}
        {mode === 'dispersion' && 'White Light → ROYGBIV Spectrum'}
        {mode === 'totalReflection' && 'Total Internal Reflection (n₁ > n₂)'}
      </div>

      <div className="absolute bottom-4 right-4 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.5)] p-2 font-mono-display text-[9px] text-slate-400">
        <div className="mb-1 text-slate-500">LEGEND:</div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500" /> <span>Object (green)</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-500" /> <span>Image (red)</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-400" /> <span>Focal points</span></div>
      </div>
    </div>
  )
}

Optics.getSceneConfig = (variables = {}) => {
  const { lensType = 'convex', focalLength = 2, objectDistance = 4, objectHeight = 1 } = variables

  const signedF = signedFocalLength(lensType, focalLength)
  const v = lensEquation(signedF, objectDistance) * SCENE_SCALE
  const m = magnification(signedF, objectDistance)

  return {
    name: 'Optics',
    description: `${lensType} lens optics with principal rays`,
    type: 'optics',
    physics: {
      lensType,
      focalLength: signedF,
      objectDistance,
      objectHeight,
      imageDistance: v / SCENE_SCALE,
      magnification: m,
    },
    calculations: {
      lensEquation: `1/f = 1/do + 1/di`,
      magnification: `m = -v/u = ${m.toFixed(3)}`,
      imageDistance: `v = ${isFinite(v) ? (v / SCENE_SCALE).toFixed(2) : '∞'} m`,
    },
  }
}
