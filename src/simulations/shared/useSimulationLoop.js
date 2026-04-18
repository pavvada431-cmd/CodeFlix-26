import { useEffect, useRef, useState } from 'react';

// requestAnimationFrame-driven loop that advances a pure physics step.
// `step(state, dt)` must return the next state (or mutate + return). A new
// reference object is NOT required — we setState with whatever is returned,
// and React will re-render if it differs. Use `snapshot` to project state
// into renderer-friendly shape without reconstructing the whole state object
// every frame.
//
// Returns { state, reset, isRunning }
export default function useSimulationLoop({ initialState, step, isPlaying, maxDt = 0.05 }) {
  const stateRef = useRef(initialState);
  const [tick, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!isPlaying) return undefined;
    lastTimeRef.current = 0;
    const frame = (now) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dtSeconds = Math.min(maxDt, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      try {
        const next = stepRef.current(stateRef.current, dtSeconds);
        stateRef.current = next ?? stateRef.current;
      } catch (err) {
        console.error('[sim-loop] step error:', err);
      }
      setTick((t) => (t + 1) % 1e9);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [isPlaying, maxDt]);

  return {
    state: stateRef.current,
    tick,
    reset: (next) => {
      stateRef.current = next;
      setTick((t) => (t + 1) % 1e9);
    },
  };
}
