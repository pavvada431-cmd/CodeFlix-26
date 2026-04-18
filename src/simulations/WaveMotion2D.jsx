import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

export default function WaveMotion2D(rawProps) {
  const {
    amplitude = 0.5,
    frequency = 1,
    wavelength = 2,
    waveSpeed: providedSpeed,
    waveType = 'transverse',
    isPlaying = false,
    onDataPoint,
  } = useSanitizedProps(rawProps);

  const speed = useMemo(() => {
    const calc = wavelength * frequency;
    return Number.isFinite(providedSpeed) && providedSpeed > 0 ? providedSpeed : calc;
  }, [wavelength, frequency, providedSpeed]);

  const spanX = Math.max(6, wavelength * 3);
  const world = useMemo(() => ({
    width: spanX,
    height: Math.max(4, amplitude * 4 + 2),
    origin: { x: 0.4, y: Math.max(4, amplitude * 4 + 2) / 2 },
    background: '#07111f',
    grid: { step: 0.5 },
  }), [spanX, amplitude]);

  const [t, setT] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const emitRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return undefined; }
    startRef.current = 0;
    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      setT(elapsed);
      if (onDataPoint && elapsed - emitRef.current > 0.05) {
        emitRef.current = elapsed;
        const omega = 2 * Math.PI * frequency;
        const k = (2 * Math.PI) / Math.max(1e-6, wavelength);
        onDataPoint({
          t_s: elapsed,
          amplitude_m: amplitude,
          frequency_hz: frequency,
          wavelength_m: wavelength,
          waveSpeed_mps: speed,
          angularFrequency_radps: omega,
          waveNumber_radpm: k,
          period_s: 1 / Math.max(1e-6, frequency),
          displacement_m: amplitude * Math.sin(omega * elapsed),
          type: waveType,
          velocity: speed,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, amplitude, frequency, wavelength, speed, waveType, onDataPoint]);

  const omega = 2 * Math.PI * frequency;
  const k = (2 * Math.PI) / Math.max(1e-6, wavelength);

  const samples = 200;
  const wavePoints = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * spanX;
    const y = amplitude * Math.sin(k * x - omega * t);
    wavePoints.push([x, y]);
  }

  const particleX = Math.min(spanX - 0.3, spanX * 0.4);
  const particleY = amplitude * Math.sin(k * particleX - omega * t);

  const bodies = [
    { id: 'axis', type: 'line', x1: 0, y1: 0, x2: spanX, y2: 0,
      stroke: 'rgba(0,245,255,0.35)', strokeWidth: 0.02 },
    { id: 'wave', type: 'polygon', points: wavePoints,
      fill: 'none', stroke: '#00f5ff', strokeWidth: 0.05 },
    { id: 'particle', type: 'circle', x: particleX, y: particleY, r: 0.1,
      fill: '#ffaa00', stroke: '#fff1c1', strokeWidth: 0.03 },
  ];

  const labels = [
    { id: 'v', x: spanX / 2, y: amplitude + 1.1, text: `v = ${speed.toFixed(2)} m/s`, color: '#e5f8ff' },
    { id: 'f', x: 0.2, y: -amplitude - 0.6, text: `f = ${frequency.toFixed(2)} Hz`, color: '#00f5ff', anchor: 'start' },
    { id: 'l', x: spanX - 0.2, y: -amplitude - 0.6, text: `λ = ${wavelength.toFixed(2)} m`, color: '#ffaa00', anchor: 'end' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} labels={labels} />
    </div>
  );
}
