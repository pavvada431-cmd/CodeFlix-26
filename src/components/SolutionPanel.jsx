import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronDown, ChevronUp, Lock, Unlock, FlaskConical, Sigma } from 'lucide-react';
import { AnimatedCounter, VariableSlider } from './LoadingStates';

const STATUS_STYLES = {
  Running: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  Paused: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  Complete: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  Idle: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
};

// Per-simulation "What If?" options. Values interpolate current variables
// so suggestions remain relevant as the user scrubs parameters.
function getWhatIfs(typeKey, vars, update) {
  const safe = (key, fallback) => (Number.isFinite(vars?.[key]) ? vars[key] : fallback);
  const fmt = (n, d = 2) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(d));

  const byType = {
    projectile_motion: () => {
      const angle = safe('angle', 45);
      const nextAngle = angle >= 45 ? 30 : 60;
      const v0 = safe('velocity', 20);
      return [
        { label: `What if the launch angle was ${nextAngle}°?`, run: () => update('angle', nextAngle),
          explain: 'Range peaks at 45°. Steeper angles trade horizontal reach for max height.' },
        { label: `What if initial velocity doubled (${fmt(v0 * 2, 0)} m/s)?`, run: () => update('velocity', v0 * 2),
          explain: 'Range scales with v₀² — doubling speed quadruples the horizontal distance.' },
        { label: 'What if there was no gravity?', run: () => update('gravity', 0),
          explain: 'No vertical pull — the projectile flies in a straight line indefinitely.' },
        { label: 'What if this was on the Moon (g = 1.62)?', run: () => update('gravity', 1.62),
          explain: 'Weaker gravity → longer flight time and ~6× the range on Earth.' },
      ];
    },
    pendulum: () => {
      const L = safe('length', 1);
      const A = safe('angle', 20);
      return [
        { label: `What if length doubled (${fmt(L * 2)} m)?`, run: () => update('length', L * 2),
          explain: 'Period ∝ √L — 2× the length gives ~1.41× slower swing.' },
        { label: 'What if this was on the Moon (g = 1.62)?', run: () => update('gravity', 1.62),
          explain: 'Weaker gravity stretches the period by √(g_earth / g_moon) ≈ 2.46.' },
        { label: A < 30
            ? `What if amplitude was 75°?`
            : `What if amplitude was 10°?`,
          run: () => update('angle', A < 30 ? 75 : 10),
          explain: A < 30
            ? 'Small-angle approximation breaks down — the period lengthens with amplitude.'
            : 'Well within the small-angle regime — period is nearly amplitude-independent.' },
      ];
    },
    spring_mass: () => {
      const k = safe('stiffness', 10);
      const m = safe('mass', 1);
      const critical = 2 * Math.sqrt(k * m);
      return [
        { label: `What if stiffness quadrupled (${fmt(k * 4, 0)} N/m)?`, run: () => update('stiffness', k * 4),
          explain: 'ω = √(k/m) — 4× stiffness doubles frequency and halves the period.' },
        { label: `What if mass quadrupled (${fmt(m * 4)} kg)?`, run: () => update('mass', m * 4),
          explain: 'Heavier bob halves the angular frequency and doubles the period.' },
        { label: 'What if there was no damping?', run: () => update('damping', 0),
          explain: 'Pure SHM — energy is perfectly conserved and oscillation never decays.' },
        { label: `What if damping was critical (${fmt(critical)})?`, run: () => update('damping', critical),
          explain: 'Returns to equilibrium as quickly as possible without overshoot.' },
      ];
    },
    inclined_plane: () => {
      const mu = safe('friction', 0.2);
      const angle = safe('angle', 30);
      const m = safe('mass', 1);
      return [
        { label: mu > 0 ? 'What if the ramp was frictionless?' : `What if friction was 0.4?`,
          run: () => update('friction', mu > 0 ? 0 : 0.4),
          explain: mu > 0
            ? 'Block accelerates at g·sinθ with nothing opposing the slide.'
            : 'With μ ≈ 0.4, the block may not slide at all if tanθ < μ.' },
        { label: `What if the slope was ${angle < 45 ? 60 : 20}°?`,
          run: () => update('angle', angle < 45 ? 60 : 20),
          explain: 'Steeper slopes amplify the parallel component and shrink the normal force.' },
        { label: `What if mass tripled (${fmt(m * 3)} kg)?`, run: () => update('mass', m * 3),
          explain: 'Acceleration is mass-independent — gravity and friction scale together.' },
      ];
    },
    circular_motion: () => {
      const r = safe('radius', 2);
      const v = safe('velocity', 5);
      return [
        { label: `What if the radius halved (${fmt(r / 2)} m)?`, run: () => update('radius', r / 2),
          explain: 'Centripetal force = mv²/r — halving r doubles the required force.' },
        { label: `What if speed doubled (${fmt(v * 2, 1)} m/s)?`, run: () => update('velocity', v * 2),
          explain: 'Force scales with v² — four times the pull needed to hold the orbit.' },
        { label: 'What if gravity was zero?', run: () => update('gravity', 0),
          explain: 'Orbit persists forever — no weight to overcome and no tangential loss.' },
      ];
    },
    collisions: () => {
      const m1 = safe('mass1', 1);
      return [
        { label: 'What if perfectly elastic (e = 1)?', run: () => update('restitution', 1),
          explain: 'All kinetic energy is preserved — objects rebound cleanly.' },
        { label: 'What if perfectly inelastic (e = 0)?', run: () => update('restitution', 0),
          explain: 'Maximum KE loss — objects stick together and move as one mass.' },
        { label: `What if the target was 10× heavier (${fmt(m1 * 10)} kg)?`, run: () => update('mass2', m1 * 10),
          explain: 'Heavy target barely moves; projectile rebounds near its incoming speed.' },
      ];
    },
    wave_motion: () => {
      const f = safe('frequency', 1);
      const A = safe('amplitude', 1);
      return [
        { label: `What if frequency doubled (${fmt(f * 2, 1)} Hz)?`, run: () => update('frequency', f * 2),
          explain: 'At fixed wave speed, wavelength halves (v = fλ).' },
        { label: `What if amplitude halved (${fmt(A / 2, 2)})?`, run: () => update('amplitude', A / 2),
          explain: 'Power scales with A² — four times less energy transmitted per second.' },
      ];
    },
    gravitational_orbits: () => {
      const M = safe('centralMass', 100);
      const d = safe('distance', 5);
      const v = safe('initialVelocity', 4);
      return [
        { label: `What if central mass doubled (${fmt(M * 2, 0)})?`, run: () => update('centralMass', M * 2),
          explain: 'Stronger pull — orbit tightens and speeds up (T ∝ 1/√M).' },
        { label: `What if distance doubled (${fmt(d * 2)} )?`, run: () => update('distance', d * 2),
          explain: 'Kepler III: period scales with r^(3/2) — far orbits are much slower.' },
        { label: `What if orbital speed halved (${fmt(v / 2, 2)})?`, run: () => update('initialVelocity', v / 2),
          explain: 'Likely below circular velocity — the orbit collapses into the primary.' },
      ];
    },
    radioactive_decay: () => {
      const t = safe('halfLife', 5);
      const N = safe('initialAmount', 100);
      return [
        { label: `What if half-life was 10× longer (${fmt(t * 10, 1)})?`, run: () => update('halfLife', t * 10),
          explain: 'Decay slows dramatically — 97% of atoms remain after the original half-life.' },
        { label: `What if initial amount doubled (${fmt(N * 2, 0)})?`, run: () => update('initialAmount', N * 2),
          explain: 'Activity (decays/sec) doubles, but half-life is a property of the isotope.' },
      ];
    },
    electric_fields: () => {
      const q = safe('charge', 1);
      const d = safe('distance', 1);
      return [
        { label: 'What if the charge flipped sign?', run: () => update('charge', -q),
          explain: 'Field lines reverse — what was a source becomes a sink.' },
        { label: `What if distance halved (${fmt(d / 2, 2)} m)?`, run: () => update('distance', d / 2),
          explain: 'E ∝ 1/r² — halving the distance quadruples the field strength.' },
      ];
    },
    magnetic_fields: () => {
      const I = safe('current', 1);
      return [
        { label: `What if current doubled (${fmt(I * 2, 1)} A)?`, run: () => update('current', I * 2),
          explain: 'B scales linearly with I — double the current, double the field.' },
        { label: 'What if current reversed?', run: () => update('current', -I),
          explain: 'Field lines reverse direction (right-hand rule flips).' },
      ];
    },
    circuit: () => {
      const V = safe('voltage', 9);
      const R = safe('resistance', 100);
      return [
        { label: `What if voltage doubled (${fmt(V * 2, 0)} V)?`, run: () => update('voltage', V * 2),
          explain: 'Ohm\'s law: I = V/R — current doubles, power quadruples.' },
        { label: `What if resistance halved (${fmt(R / 2, 0)} Ω)?`, run: () => update('resistance', R / 2),
          explain: 'Current doubles at fixed voltage; heat dissipation grows with I².' },
      ];
    },
    gas_laws: () => {
      const T = safe('temperature', 300);
      const V = safe('volume', 1);
      return [
        { label: `What if temperature doubled (${fmt(T * 2, 0)} K)?`, run: () => update('temperature', T * 2),
          explain: 'At constant V, pressure doubles (Gay-Lussac).' },
        { label: `What if volume halved (${fmt(V / 2, 2)})?`, run: () => update('volume', V / 2),
          explain: 'At constant T, pressure doubles (Boyle\'s law).' },
      ];
    },
    optics: () => {
      const f = safe('focalLength', 10);
      const d = safe('objectDistance', 20);
      return [
        { label: `What if focal length halved (${fmt(f / 2, 1)} cm)?`, run: () => update('focalLength', f / 2),
          explain: 'Stronger lens — image forms closer and magnification changes.' },
        { label: `What if the object was at the focal point?`, run: () => update('objectDistance', f),
          explain: 'Rays emerge parallel — image forms at infinity (no real image).' },
        { label: `What if the object moved to 2f (${fmt(f * 2, 1)} cm)?`, run: () => update('objectDistance', f * 2),
          explain: 'Image forms at 2f on the other side, same size, inverted.' },
      ];
    },
    fluid_mechanics: () => {
      const rho = safe('density', 1000);
      return [
        { label: 'What if the object was denser than water?', run: () => update('objectDensity', rho * 1.5),
          explain: 'Negative buoyancy — object sinks until it meets the floor.' },
        { label: 'What if the object was half as dense?', run: () => update('objectDensity', rho / 2),
          explain: 'Floats with half its volume submerged (Archimedes\' balance).' },
      ];
    },
    titration: () => {
      const c = safe('titrantConcentration', 0.1);
      return [
        { label: `What if titrant concentration doubled (${fmt(c * 2, 2)} M)?`, run: () => update('titrantConcentration', c * 2),
          explain: 'Equivalence reached in half the volume — steeper jump at endpoint.' },
        { label: 'What if we used a weak acid instead?', run: () => update('acidStrength', 'weak'),
          explain: 'Equivalence pH shifts above 7 and the titration curve\'s slope softens.' },
      ];
    },
    stoichiometry: () => {
      const n = safe('moles', 1);
      return [
        { label: `What if we doubled the reactant (${fmt(n * 2, 2)} mol)?`, run: () => update('moles', n * 2),
          explain: 'Product amounts scale linearly if the limiting reagent is unchanged.' },
      ];
    },
    combustion: () => {
      const n = safe('fuelMoles', 1);
      return [
        { label: `What if fuel doubled (${fmt(n * 2, 2)} mol)?`, run: () => update('fuelMoles', n * 2),
          explain: 'Products (CO₂, H₂O) and heat released both double.' },
        { label: 'What if oxygen was limited?', run: () => update('oxygenRatio', 0.5),
          explain: 'Incomplete combustion — CO and soot appear in the products.' },
      ];
    },
    rotational_mechanics: () => {
      const I = safe('inertia', 1);
      const tau = safe('torque', 1);
      return [
        { label: `What if torque doubled (${fmt(tau * 2, 2)} N·m)?`, run: () => update('torque', tau * 2),
          explain: 'α = τ/I — angular acceleration doubles.' },
        { label: `What if moment of inertia halved (${fmt(I / 2, 2)})?`, run: () => update('inertia', I / 2),
          explain: 'Same torque spins up the body twice as fast.' },
      ];
    },
  };

  if (byType[typeKey]) return byType[typeKey]();

  // Generic fallback — picks up to three numeric variables and offers "double" probes
  const numeric = Object.entries(vars || {}).filter(([, v]) => Number.isFinite(v) && v !== 0);
  const out = [];
  if ('gravity' in (vars || {})) {
    out.push({ label: 'What if there was no gravity?', run: () => update('gravity', 0),
      explain: 'Removes gravitational acceleration entirely.' });
  }
  for (const [k, v] of numeric.slice(0, 3)) {
    if (k === 'gravity') continue;
    out.push({
      label: `What if ${k} doubled (${fmt(v * 2, 2)})?`,
      run: () => update(k, v * 2),
      explain: `Explore how scaling ${k} reshapes the simulation.`,
    });
    if (out.length >= 3) break;
  }
  return out;
}

const TITLE_MAP = {
  projectile_motion: { title: 'Projectile Motion', subtitle: 'Parabolic Trajectory Analysis', category: 'Mechanics → Kinematics' },
  pendulum: { title: 'Pendulum', subtitle: 'Nonlinear Oscillation Analysis', category: 'Mechanics → Oscillations' },
  spring_mass: { title: 'Spring-Mass', subtitle: 'Simple Harmonic Motion', category: 'Mechanics → Oscillations' },
  inclined_plane: { title: 'Inclined Plane', subtitle: 'Forces on an Angle', category: 'Mechanics → Dynamics' },
  collisions: { title: 'Collisions', subtitle: 'Momentum and Energy Transfer', category: 'Mechanics → Momentum' },
  circular_motion: { title: 'Circular Motion', subtitle: 'Centripetal Dynamics', category: 'Mechanics → Dynamics' },
};

const FORMULA_MAP = {
  projectile_motion: [
    { id: 'vx', label: 'Horizontal velocity', tex: 'v_x=v_0\\cos\\theta', vars: ['velocity', 'angle'], calc: ({ velocity = 0, angle = 0 }) => velocity * Math.cos((angle * Math.PI) / 180), unit: 'm/s' },
    { id: 'vy', label: 'Vertical velocity', tex: 'v_y=v_0\\sin\\theta', vars: ['velocity', 'angle'], calc: ({ velocity = 0, angle = 0 }) => velocity * Math.sin((angle * Math.PI) / 180), unit: 'm/s' },
    { id: 'tof', label: 'Time of flight', tex: 'T=\\frac{2v_0\\sin\\theta}{g}', vars: ['velocity', 'angle', 'gravity'], calc: ({ velocity = 0, angle = 0, gravity = 9.81 }) => (gravity === 0 ? 0 : (2 * velocity * Math.sin((angle * Math.PI) / 180)) / gravity), unit: 's' },
    { id: 'range', label: 'Range', tex: 'R=\\frac{v_0^2\\sin(2\\theta)}{g}', vars: ['velocity', 'angle', 'gravity'], calc: ({ velocity = 0, angle = 0, gravity = 9.81 }) => (gravity === 0 ? 0 : (velocity * velocity * Math.sin((2 * angle * Math.PI) / 180)) / gravity), unit: 'm' },
    { id: 'height', label: 'Max height', tex: 'H=\\frac{v_0^2\\sin^2\\theta}{2g}', vars: ['velocity', 'angle', 'gravity'], calc: ({ velocity = 0, angle = 0, gravity = 9.81 }) => {
      const s = Math.sin((angle * Math.PI) / 180);
      return gravity === 0 ? 0 : (velocity * velocity * s * s) / (2 * gravity);
    }, unit: 'm' },
  ],
  inclined_plane: [
    { id: 'parallel', label: 'Parallel force', tex: 'F_{\\parallel}=mg\\sin\\theta', vars: ['mass', 'gravity', 'angle'], calc: ({ mass = 1, gravity = 9.81, angle = 0 }) => mass * gravity * Math.sin((angle * Math.PI) / 180), unit: 'N' },
    { id: 'normal', label: 'Normal force', tex: 'N=mg\\cos\\theta', vars: ['mass', 'gravity', 'angle'], calc: ({ mass = 1, gravity = 9.81, angle = 0 }) => mass * gravity * Math.cos((angle * Math.PI) / 180), unit: 'N' },
    { id: 'accel', label: 'Acceleration', tex: 'a=g(\\sin\\theta-\\mu\\cos\\theta)', vars: ['gravity', 'angle', 'friction'], calc: ({ gravity = 9.81, angle = 0, friction = 0 }) => gravity * (Math.sin((angle * Math.PI) / 180) - friction * Math.cos((angle * Math.PI) / 180)), unit: 'm/s²' },
  ],
};

const formatNumber = (value, digits = 2) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1000 || (abs > 0 && abs < 0.01)) return value.toExponential(2);
  return value.toFixed(digits);
};

const toTypeKey = (type) => String(type || '').toLowerCase().replace(/\s+/g, '_');

const getNumericEntries = (values = {}) =>
  Object.entries(values).filter(([, value]) => typeof value === 'number' && Number.isFinite(value));

const sparklinePath = (values, width = 120, height = 30) => {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, i) => {
      const x = (i / (values.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

function Sparkline({ data = [] }) {
  const path = sparklinePath(data.slice(-24));
  return (
    <svg viewBox="0 0 120 30" className="mt-2 h-8 w-full opacity-75">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MetricCard({ label, value, unit, trend = 0, sparkline }) {
  const trendClass = trend > 0.01 ? 'text-emerald-300' : trend < -0.01 ? 'text-rose-300' : 'text-slate-300';
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-bg)_72%,transparent)] p-3 backdrop-blur-md">
      <p className="text-xs text-[var(--color-text)]/70">{label}</p>
      <div className={`mt-1 flex items-end gap-1 ${trendClass}`}>
        <AnimatedCounter value={value} decimals={2} className="text-xl font-semibold" />
        <span className="pb-0.5 text-xs">{unit}</span>
      </div>
      <Sparkline data={sparkline} />
    </div>
  );
}

function Collapsible({ title, icon, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-bg)_72%,transparent)] backdrop-blur-md">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[var(--color-border)]/70 px-3 py-3"
          >
            {children}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormulaBlock({ formula, variables, active, onUse }) {
  const [input, setInput] = useState(() =>
    formula.vars.reduce((acc, key) => {
      acc[key] = typeof variables[key] === 'number' ? variables[key] : 0;
      return acc;
    }, {})
  );

  const result = useMemo(() => formula.calc(input), [formula, input]);

  return (
    <div className={`rounded-lg border p-3 transition-all ${active ? 'border-[var(--color-accent)]/60 bg-[var(--color-accent)]/8' : 'border-[var(--color-border)] bg-black/5'}`}>
      <p className="text-xs text-[var(--color-text)]/70">{formula.label}</p>
      <div
        className="mt-2 p-3 rounded-lg bg-[var(--color-bg)]/50 border border-[var(--color-accent)]/30 text-base font-mono"
        dangerouslySetInnerHTML={{ __html: katex.renderToString(formula.tex, { throwOnError: false }) }}
        style={{ color: 'var(--color-accent)' }}
      />
      <button
        type="button"
        onClick={onUse}
        className="mt-2 rounded-md border px-2 py-1 text-xs transition"
        style={{
          borderColor: 'var(--color-accent)',
          backgroundColor: active ? 'var(--color-accent-dim)' : 'rgba(34, 211, 238, 0.08)',
          color: active ? 'var(--color-accent)' : 'var(--color-text-muted)'
        }}
      >
        {active ? '✓ Active' : 'Use this'}
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {formula.vars.map((key) => (
          <label key={key} className="text-xs">
            <span className="mb-1 block text-[var(--color-text)]/70">{key}</span>
            <input
              type="number"
              step="any"
              value={input[key]}
              onChange={(e) => setInput((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-2 py-1"
            />
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-text)]/70">
        Result: <strong className="text-[var(--color-accent)]">{formatNumber(result)}</strong> {formula.unit}
      </p>
    </div>
  );
}

function EnergyDiagram({ kinetic = 0, potential = 0 }) {
  const total = Math.max(kinetic + potential, 0.0001);
  const kePct = Math.max((kinetic / total) * 100, 0);
  const pePct = Math.max((potential / total) * 100, 0);
  return (
    <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-black/10 p-3">
      <div className="h-4 overflow-hidden rounded-full bg-[var(--color-border)]/40">
        <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${kePct}%` }} />
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-[var(--color-border)]/40">
        <div className="h-full bg-purple-400 transition-all duration-200" style={{ width: `${pePct}%` }} />
      </div>
      <div className="text-xs text-[var(--color-text)]/75">
        KE: {formatNumber(kinetic)} J • PE: {formatNumber(potential)} J • Total: {formatNumber(kinetic + potential)} J
      </div>
    </div>
  );
}

function FreeBodyDiagram({ variables = {}, simulationType }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const center = { x: 120, y: 70 };
    const mass = variables.mass || 1;
    const g = variables.gravity || 9.81;
    const theta = ((variables.angle || 0) * Math.PI) / 180;
    const mu = variables.friction || 0;

    const vectors = [];
    if (simulationType === 'inclined_plane') {
      const n = mass * g * Math.cos(theta);
      const f = mu * n;
      const w = mass * g;
      vectors.push({ label: 'Weight', mag: w, dx: 0, dy: 1, color: '#f97316' });
      vectors.push({ label: 'Normal', mag: n, dx: -Math.sin(theta), dy: -Math.cos(theta), color: '#22c55e' });
      vectors.push({ label: 'Friction', mag: f, dx: -Math.cos(theta), dy: Math.sin(theta), color: '#60a5fa' });
      vectors.push({ label: 'mg sinθ', mag: mass * g * Math.sin(theta), dx: Math.cos(theta), dy: Math.sin(theta), color: '#e879f9' });
    } else {
      const w = mass * g;
      vectors.push({ label: 'Weight', mag: w, dx: 0, dy: 1, color: '#f97316' });
    }

    const maxMag = Math.max(...vectors.map((v) => v.mag), 1);
    ctx.fillStyle = 'rgba(148,163,184,0.2)';
    ctx.fillRect(100, 50, 40, 40);

    vectors.forEach((vector, index) => {
      const length = 18 + (vector.mag / maxMag) * 40;
      const x2 = center.x + vector.dx * length;
      const y2 = center.y + vector.dy * length;
      ctx.strokeStyle = vector.color;
      ctx.fillStyle = vector.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const angle = Math.atan2(y2 - center.y, x2 - center.x);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 6 * Math.cos(angle - 0.3), y2 - 6 * Math.sin(angle - 0.3));
      ctx.lineTo(x2 - 6 * Math.cos(angle + 0.3), y2 - 6 * Math.sin(angle + 0.3));
      ctx.closePath();
      ctx.fill();
      ctx.font = '11px sans-serif';
      ctx.fillText(vector.label, 8, 15 + index * 14);
    });
  }, [variables, simulationType]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-black/10 p-3">
      <canvas ref={canvasRef} width={240} height={140} className="w-full max-w-[280px]" />
    </div>
  );
}

export default function SolutionPanel({
  parsedData,
  currentVariables = {},
  dataStream = [],
  isPlaying = false,
  simulationType,
  onUpdateVariable,
  onVariableChange,
}) {
  const updateVariable = onUpdateVariable || onVariableChange || (() => {});
  const typeKey = toTypeKey(simulationType || parsedData?.type || parsedData?.simulationType);
  const labels = TITLE_MAP[typeKey] || {
    title: parsedData?.simulationTitle || 'Simulation',
    subtitle: parsedData?.subtitle || 'Interactive Analysis',
    category: parsedData?.category || 'Physics',
  };

  const latest = useMemo(() => dataStream[dataStream.length - 1] || {}, [dataStream]);
  const previous = useMemo(() => dataStream[dataStream.length - 2] || latest, [dataStream, latest]);
  const status = isPlaying ? 'Running' : dataStream.length > 1 ? 'Complete' : 'Paused';

  const metrics = useMemo(() => {
    const speed = Number.isFinite(latest.velocity)
      ? latest.velocity
      : Math.hypot(latest.vx || 0, latest.vy || 0, latest.vz || 0);
    const energyKinetic = Number.isFinite(latest.kineticEnergy)
      ? latest.kineticEnergy
      : 0.5 * (currentVariables.mass || 1) * speed * speed;
    const height = latest.height ?? latest.y ?? currentVariables.height ?? 0;
    const potential = Number.isFinite(latest.potentialEnergy)
      ? latest.potentialEnergy
      : (currentVariables.mass || 1) * (currentVariables.gravity ?? 9.81) * Math.max(height, 0);
    const distance = latest.range ?? latest.x ?? latest.distance ?? 0;
    const t = latest.t ?? latest.time ?? 0;
    return [
      { key: 'speed', label: 'Current velocity', value: speed, unit: 'm/s' },
      { key: 'height', label: 'Current height', value: height, unit: 'm' },
      { key: 'distance', label: 'Horizontal distance', value: distance, unit: 'm' },
      { key: 'time', label: 'Time elapsed', value: t, unit: 's' },
      { key: 'ke', label: 'Kinetic energy', value: energyKinetic, unit: 'J' },
      { key: 'pe', label: 'Potential energy', value: potential, unit: 'J' },
    ];
  }, [latest, currentVariables]);

  const metricTrends = useMemo(() => ({
    speed: (latest.velocity ?? 0) - (previous.velocity ?? 0),
    height: (latest.height ?? latest.y ?? 0) - (previous.height ?? previous.y ?? 0),
    distance: (latest.range ?? latest.x ?? 0) - (previous.range ?? previous.x ?? 0),
    time: (latest.t ?? latest.time ?? 0) - (previous.t ?? previous.time ?? 0),
    ke: (latest.kineticEnergy ?? 0) - (previous.kineticEnergy ?? 0),
    pe: (latest.potentialEnergy ?? 0) - (previous.potentialEnergy ?? 0),
  }), [latest, previous]);

  const formulas = FORMULA_MAP[typeKey] || [];
  const [activeFormula, setActiveFormula] = useState(null);
  const resolvedActiveFormula = formulas.some((formula) => formula.id === activeFormula)
    ? activeFormula
    : formulas[0]?.id || null;

  const defaultsRef = useRef({ ...(parsedData?.variables || currentVariables) });
  const [userLocked, setUserLocked] = useState(false);
  const controlsLocked = isPlaying || userLocked;

  const numericEntries = getNumericEntries(currentVariables);
  const variableMeta = useMemo(() => {
    return numericEntries.map(([key, value]) => {
      const abs = Math.abs(value);
      let min = 0;
      let max = Math.max(abs * 2, 10);
      if (key.toLowerCase().includes('angle')) {
        min = 0;
        max = 90;
      } else if (key.toLowerCase().includes('gravity')) {
        min = 0;
        max = 20;
      } else if (key.toLowerCase().includes('friction')) {
        min = 0;
        max = 1;
      } else if (value < 0) {
        min = value * 2;
        max = Math.abs(value) * 2;
      }
      return { key, value, min, max, unit: key === 'mass' ? 'kg' : key === 'angle' ? '°' : key === 'velocity' ? 'm/s' : '' };
    });
  }, [numericEntries]);

  const generatedSteps = (() => {
    if (Array.isArray(parsedData?.steps) && parsedData.steps.length) return parsedData.steps;
    if (typeKey !== 'projectile_motion') return ['Run the simulation to generate automatic step-by-step derivations.'];
    const v0 = currentVariables.velocity ?? 20;
    const theta = currentVariables.angle ?? 45;
    const g = currentVariables.gravity ?? 9.81;
    const rad = (theta * Math.PI) / 180;
    const vx = v0 * Math.cos(rad);
    const vy = v0 * Math.sin(rad);
    const T = g === 0 ? 0 : (2 * vy) / g;
    const R = vx * T;
    const H = g === 0 ? 0 : (vy * vy) / (2 * g);
    return [
      `Given: v₀ = ${formatNumber(v0)} m/s, θ = ${formatNumber(theta)}°, g = ${formatNumber(g)} m/s²`,
      `Horizontal: vₓ = v₀ cos(θ) = ${formatNumber(vx)} m/s`,
      `Vertical: vᵧ = v₀ sin(θ) = ${formatNumber(vy)} m/s`,
      `Time of flight: T = 2vᵧ/g = ${formatNumber(T)} s`,
      `Range: R = vₓ × T = ${formatNumber(R)} m`,
      `Max height: H = vᵧ²/(2g) = ${formatNumber(H)} m`,
    ];
  })();

  const [showSteps, setShowSteps] = useState(false);
  const [hideAutoSteps, setHideAutoSteps] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [revealedSteps, setRevealedSteps] = useState(1);
  const autoShowSteps = !isPlaying && dataStream.length > 2;
  const stepsVisible = showSteps || (autoShowSteps && !hideAutoSteps);

  useEffect(() => {
    if (!stepsVisible || showAllSteps) return;
    const id = setInterval(() => {
      setRevealedSteps((v) => {
        if (v >= generatedSteps.length) return v;
        return v + 1;
      });
    }, 180);
    return () => clearInterval(id);
  }, [stepsVisible, showAllSteps, generatedSteps.length]);

  const sparklineFor = (metricKey) => {
    const map = {
      speed: dataStream.map((p) => p.velocity ?? Math.hypot(p.vx || 0, p.vy || 0)),
      height: dataStream.map((p) => p.height ?? p.y ?? 0),
      distance: dataStream.map((p) => p.range ?? p.x ?? p.distance ?? 0),
      time: dataStream.map((p) => p.t ?? p.time ?? 0),
      ke: dataStream.map((p) => p.kineticEnergy ?? 0),
      pe: dataStream.map((p) => p.potentialEnergy ?? 0),
    };
    return map[metricKey] || [];
  };

  const randomizeVariables = () => {
    variableMeta.forEach((meta) => {
      const rand = meta.min + Math.random() * (meta.max - meta.min);
      updateVariable(meta.key, Number(rand.toFixed(2)));
    });
  };

  const toggleSteps = () => {
    if (stepsVisible) {
      setShowSteps(false);
      setHideAutoSteps(true);
      return;
    }
    setHideAutoSteps(false);
    setShowSteps(true);
    setRevealedSteps(showAllSteps ? generatedSteps.length : 1);
  };

  const toggleShowAllSteps = () => {
    setShowAllSteps((prev) => {
      const next = !prev;
      setRevealedSteps(next ? generatedSteps.length : 1);
      return next;
    });
  };

  const whatIfOptions = useMemo(
    () => getWhatIfs(typeKey, currentVariables, updateVariable),
    [typeKey, currentVariables, updateVariable]
  );

  return (
    <div data-tour="solution-panel" className="solution-panel-scroll h-full overflow-y-auto pr-1 text-[var(--color-text)]">
      <style>{`
        .solution-panel-scroll::-webkit-scrollbar{width:8px}
        .solution-panel-scroll::-webkit-scrollbar-track{background:transparent}
        .solution-panel-scroll::-webkit-scrollbar-thumb{background:color-mix(in oklab,var(--color-border) 75%,transparent);border-radius:8px}
      `}</style>

      <div className="space-y-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-bg)_70%,transparent)] p-4 backdrop-blur-md">
          <p className="text-2xl font-bold">{labels.title}</p>
          <p className="mt-1 text-sm text-[var(--color-text)]/70">{labels.subtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[status] || STATUS_STYLES.Idle}`}>{status}</span>
            <span className="rounded-full border border-[var(--color-border)] bg-black/10 px-2 py-0.5 text-xs">{labels.category}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              trend={metricTrends[metric.key]}
              sparkline={sparklineFor(metric.key)}
            />
          ))}
        </div>

        <Collapsible title="Formula Reference" icon={<Sigma size={16} />} defaultOpen>
          {formulas.length === 0 ? (
            <p className="text-xs text-[var(--color-text)]/70">No formula pack defined for this simulation yet.</p>
          ) : (
            <div className="space-y-2">
              {formulas.map((formula) => (
                <FormulaBlock
                  key={formula.id}
                  formula={formula}
                  variables={currentVariables}
                  active={resolvedActiveFormula === formula.id}
                  onUse={() => setActiveFormula(formula.id)}
                />
              ))}
            </div>
          )}
        </Collapsible>

        <Collapsible
          title="Variable Controls"
          icon={controlsLocked ? <Lock size={16} /> : <Unlock size={16} />}
          defaultOpen
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setUserLocked((v) => !v)}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs"
            >
              {controlsLocked ? (isPlaying ? 'Locked (running)' : 'Unlock controls') : 'Lock controls'}
            </button>
            <button
              type="button"
              onClick={randomizeVariables}
              disabled={controlsLocked}
              className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300 disabled:opacity-40"
            >
              Randomize
            </button>
          </div>
          <div className="space-y-2">
            {variableMeta.map((meta) => (
              <div key={meta.key} className="rounded-md border border-[var(--color-border)]/70 bg-black/5 p-2">
                <VariableSlider
                  label={meta.key.replace(/_/g, ' ')}
                  value={meta.value}
                  min={meta.min}
                  max={meta.max}
                  unit={meta.unit}
                  disabled={controlsLocked}
                  onChange={(value) => updateVariable(meta.key, value)}
                />
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    disabled={controlsLocked}
                    onClick={() => updateVariable(meta.key, defaultsRef.current[meta.key] ?? meta.value)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[11px] disabled:opacity-40"
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        <div className="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-bg)_72%,transparent)] p-3 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Step-by-Step Solution</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={toggleSteps}
                className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
              >
                {stepsVisible ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={toggleShowAllSteps}
                className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
              >
                {showAllSteps ? 'Stagger' : 'Show all'}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {stepsVisible && (
              <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                {generatedSteps.slice(0, revealedSteps).map((step, index) => (
                  <Motion.div
                    key={`${step}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: showAllSteps ? 0 : index * 0.04 }}
                    className="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-bg)_78%,transparent)] p-3 flex gap-3"
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-accent-dim)] border border-[var(--color-accent)]/50">
                      <span className="text-xs font-semibold text-[var(--color-accent)]">{index + 1}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--color-text)] flex-1">{step}</p>
                  </Motion.div>
                ))}
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        {['projectile_motion', 'pendulum', 'spring_mass', 'inclined_plane', 'circular_motion', 'collisions'].includes(typeKey) && (
          <Collapsible title="Energy Diagram" icon={<FlaskConical size={16} />} defaultOpen>
            <EnergyDiagram
              kinetic={metrics.find((m) => m.key === 'ke')?.value || 0}
              potential={metrics.find((m) => m.key === 'pe')?.value || 0}
            />
          </Collapsible>
        )}

        {['inclined_plane', 'projectile_motion', 'circular_motion'].includes(typeKey) && (
          <Collapsible title="Free Body Diagram" icon={<Sigma size={16} />} defaultOpen={false}>
            <FreeBodyDiagram variables={currentVariables} simulationType={typeKey} />
          </Collapsible>
        )}

        {whatIfOptions.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-bg)_74%,transparent)] p-3 backdrop-blur-md">
          <p className="text-sm font-medium">What If?</p>
          <div className="mt-2 space-y-2">
            {whatIfOptions.map((item) => (
              <div key={item.label} className="rounded-md border border-[var(--color-border)]/70 bg-black/5 p-2">
                <button
                  type="button"
                  onClick={item.run}
                  disabled={controlsLocked}
                  className="w-full rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-left text-xs text-cyan-300 disabled:opacity-40"
                >
                  {item.label}
                </button>
                <p className="mt-1 text-xs text-[var(--color-text)]/70">{item.explain}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Copy Solution Button */}
        <button
          type="button"
          onClick={() => {
            const solutionText = `
Simulation: ${TITLE_MAP[typeKey]?.title || 'Simulation'}
Variables: ${Object.entries(currentVariables)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')}
Steps: ${generatedSteps.join(' | ')}
`.trim()
            navigator.clipboard.writeText(solutionText)
            alert('Solution copied to clipboard!')
          }}
          className="w-full rounded-lg border px-4 py-2 text-sm font-medium transition"
          style={{
            borderColor: 'var(--color-accent)',
            backgroundColor: 'var(--color-accent-dim)',
            color: 'var(--color-accent)'
          }}
        >
          📋 Copy Solution
        </button>
      </div>
    </div>
  );
}
