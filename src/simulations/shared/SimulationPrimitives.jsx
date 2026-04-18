/**
 * Shared simulation primitives and components
 * Eliminates duplication across 19+ simulation files
 */
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Environment, Stars, Grid, Line } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

/**
 * FrostedLabel: Glassmorphism HTML overlay for labels
 * Used across 15+ simulations for displaying information
 */
export function FrostedLabel({ children, position, color = '#00f5ff', scale = [1, 0.3, 1] }) {
  return (
    <Html position={position} center distanceFactor={10} zIndexRange={[100, 0]}>
      <div
        style={{
          background: 'rgba(10, 15, 30, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${color}40`,
          borderRadius: '8px',
          padding: '8px 16px',
          color: color,
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: `0 4px 20px ${color}20`,
        }}
      >
        {children}
      </div>
    </Html>
  );
}

/**
 * GlowTrail: Glowing trajectory line using BufferGeometry
 * Used for projectile trails, pendulum paths, etc.
 */
export function GlowTrail({ points, color = '#00ffff', opacity = 0.8 }) {
  const lineRef = useRef();

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  if (!geometry || points.length < 2) return null;

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        linewidth={2}
      />
    </line>
  );
}

/**
 * ForceArrow: 3D arrow for force vectors
 * Shows magnitude and direction of forces
 */
export function ForceArrow({ position, direction, length, color, label }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const hw = 0.05;
    shape.moveTo(0, length);
    shape.lineTo(-hw, length - 0.15);
    shape.lineTo(-hw * 0.4, length - 0.15);
    shape.lineTo(-hw * 0.4, 0);
    shape.lineTo(hw * 0.4, 0);
    shape.lineTo(hw * 0.4, length - 0.15);
    shape.lineTo(hw, length - 0.15);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
  }, [length]);

  const rotation = useMemo(() => {
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return quat;
  }, [direction]);

  return (
    <group position={[position.x, position.y, position.z]} quaternion={rotation}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.6}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      {label && (
        <FrostedLabel position={[0, length * 0.5, 0]} color={color}>
          {label}
        </FrostedLabel>
      )}
    </group>
  );
}

/**
 * SimulationHUD: Bottom-left overlay displaying live telemetry
 * Shows time, position, velocity, energy, custom metrics
 */
export function SimulationHUD({ data = {} }) {
  const { time, position, velocity, energy, custom = {} } = data;
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(10, 15, 30, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #00f5ff40',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#00f5ff',
        fontFamily: 'monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: 1000,
        maxWidth: '280px',
        lineHeight: '1.6',
      }}
    >
      {time !== undefined && <div>t: {time.toFixed(3)}s</div>}
      {position && (
        <div>
          x: {position.x?.toFixed(3) || '—'} y: {position.y?.toFixed(3) || '—'} z: {position.z?.toFixed(3) || '—'}
        </div>
      )}
      {velocity && (
        <div>
          v: {velocity.mag?.toFixed(3) || '—'} m/s
        </div>
      )}
      {energy && (
        <div>
          E: {energy.total?.toFixed(3) || '—'} J
        </div>
      )}
      {Object.entries(custom).map(([key, value]) => (
        <div key={key}>
          {key}: {typeof value === 'number' ? value.toFixed(3) : value}
        </div>
      ))}
    </div>
  );
}

/**
 * SimulationCanvas: Wrapper around R3F Canvas with standard setup
 * Includes: OrbitControls, Environment, Stars, Grid, EffectComposer,
 * Bloom + Vignette, and ResizeObserver for smooth container resizing
 */
export const SimulationCanvas = React.forwardRef(
  ({
    children,
    camera = { position: [2, 3, 10], fov: 50 },
    shadows = true,
    includeStars = true,
    includeGrid = true,
    onContainerResize,
    ...canvasProps
  }, containerRef) => {
    const internalCanvasRef = useRef();
    const resizeObserverRef = useRef();

    useEffect(() => {
      const container = containerRef?.current || internalCanvasRef.current?.parentElement;
      if (!container) return;

      // Set up ResizeObserver to handle container resize
      resizeObserverRef.current = new ResizeObserver(() => {
        // Force canvas resize
        if (internalCanvasRef.current?.parentElement) {
          const width = container.clientWidth;
          const height = container.clientHeight;
          if (width && height) {
            onContainerResize?.({ width, height });
          }
        }
      });

      resizeObserverRef.current.observe(container);

      return () => {
        resizeObserverRef.current?.disconnect();
      };
    }, [containerRef, onContainerResize]);

    return (
      <Canvas
        ref={internalCanvasRef}
        camera={camera}
        shadows={shadows}
        style={{ width: '100%', height: '100%', background: '#0a0a1a' }}
        onCreated={(state) => {
          if (!state.gl?.getContext) return;
          try {
            const gl = state.gl.getContext('webgl2') || state.gl.getContext('webgl');
            if (gl?.canvas) {
              gl.canvas.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
              });
              gl.canvas.addEventListener('webglcontextrestored', () => {
                console.warn('WebGL context restored');
              });
            }
          } catch (e) {
            console.warn('WebGL initialization:', e.message);
          }
        }}
        {...canvasProps}
      >
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate={false}
          zoomSpeed={1.5}
        />
        <Environment preset="night" />
        {includeStars && <Stars radius={100} depth={50} count={5000} factor={4} />}
        {includeGrid && <Grid args={[100, 100]} cellSize={0.5} cellColor="#6f7183" sectionSize={5} sectionColor="#ff1040" fadeDistance={500} fadeStrength={1} infiniteGrid fadeFrom={1} fadeTo={60} />}
        
        {children}

        <EffectComposer>
          <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={2} />
          <Vignette darkness={0.3} />
        </EffectComposer>
      </Canvas>
    );
  }
);

SimulationCanvas.displayName = 'SimulationCanvas';

/**
 * CanvasResizeHandler: Hook to handle canvas resize events
 * Use this in simulations to trigger re-render when container resizes
 */
export function useCanvasResize() {
  const { gl, invalidate } = useThree();

  const handleResize = ({ width, height }) => {
    if (gl) {
      gl.setSize(width, height);
      invalidate();
    }
  };

  return handleResize;
}
