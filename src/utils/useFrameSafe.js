import { useFrame } from '@react-three/fiber';

/**
 * Safe wrapper around useFrame that catches and logs errors
 * @param {Function} callback - The frame callback
 * @param {number} renderPriority - Optional render priority
 */
export function useFrameSafe(callback, renderPriority) {
  useFrame((state, delta) => {
    try {
      callback(state, delta);
    } catch (error) {
      if (error?.message?.includes('__r3f') || error?.message?.includes('undefined')) {
        // Silently ignore Three.js internal errors during geometry/ref access
        return;
      }
      console.warn('useFrame error:', error);
    }
  }, renderPriority);
}
