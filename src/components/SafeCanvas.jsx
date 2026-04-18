import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';

/**
 * Safe Canvas wrapper with automatic error recovery
 * Catches Three.js and WebGL initialization errors
 */
export function SafeCanvas({
  children,
  fallback = <div className="text-center text-slate-400 py-8">Canvas initializing...</div>,
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  const handleCreated = (state) => {
    try {
      // Ensure WebGL context is valid
      if (!state.gl || typeof state.gl.getContext !== 'function') {
        console.warn('Canvas created but no valid WebGL context');
        return;
      }

      // Try to get WebGL context
      const ctx = state.gl.getContext('webgl2') || state.gl.getContext('webgl');
      if (!ctx) {
        console.warn('No WebGL context available');
        setHasError(true);
      }
    } catch (error) {
      console.warn('Canvas initialization error:', error);
      setHasError(true);
    }

    // Call user's onCreated if provided
    props.onCreated?.(state);
  };

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f] border border-red-500/30">
        <div className="text-center">
          <p className="text-red-400 text-sm">WebGL not available on this system</p>
          <p className="text-slate-500 text-xs mt-2">3D simulations require WebGL support</p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      {...props}
      onCreated={handleCreated}
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </Canvas>
  );
}
