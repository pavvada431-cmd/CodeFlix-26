import React from 'react';
import { Canvas } from '@react-three/fiber';

/**
 * Safe Canvas wrapper that catches Three.js and React Three Fiber errors
 * Prevents __r3f and other WebGL errors from crashing the entire simulation
 */
export default function SafeCanvas(props) {
  const handleError = (error) => {
    // Silently ignore __r3f internal errors
    if (error?.message?.includes('__r3f') || error?.message?.includes('is undefined')) {
      return;
    }
    console.warn('Canvas error:', error);
  };

  const handleCreated = (state) => {
    try {
      // Verify WebGL context
      state.gl.getContext("webgl2") || state.gl.getContext("webgl");
      
      // Call original onCreated if provided
      if (props.onCreated) {
        props.onCreated(state);
      }
    } catch (e) {
      console.warn("WebGL initialization warning:", e);
    }
  };

  return (
    <Canvas
      {...props}
      onCreated={handleCreated}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        ...(props.gl || {}),
      }}
      style={{
        width: '100%',
        height: '100%',
        ...(props.style || {}),
      }}
      onError={handleError}
    >
      {props.children}
    </Canvas>
  );
}
