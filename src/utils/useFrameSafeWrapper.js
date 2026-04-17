import { useFrame } from '@react-three/fiber';

/**
 * Safe wrapper around useFrame that catches all errors and prevents crashes
 * Logs errors to console for debugging but silently handles React Three Fiber internal errors
 */
export function useFrameSafe(callback) {
  useFrame((state, delta) => {
    try {
      callback(state, delta);
    } catch (error) {
      // Check if it's an internal React Three Fiber error we can ignore
      if (error.message?.includes('__r3f') || error.message?.includes('is undefined')) {
        // Silently handle internal errors - they usually resolve on next frame
        return;
      }
      // Log actual physics errors for debugging
      console.warn('useFrameSafe error:', error.message);
    }
  });
}

/**
 * Type-safe property setter for Three.js refs
 */
export function safeSetRefProperty(ref, prop, value) {
  try {
    if (ref?.current && prop in ref.current) {
      ref.current[prop] = value;
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Type-safe property getter for Three.js refs
 */
export function safeGetRefProperty(ref, prop, defaultValue) {
  try {
    return ref?.current?.[prop] ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe method call on ref
 */
export function safeCallRefMethod(ref, methodName, ...args) {
  try {
    if (ref?.current && typeof ref.current[methodName] === 'function') {
      return ref.current[methodName](...args);
    }
  } catch {
    return null;
  }
  return null;
}
