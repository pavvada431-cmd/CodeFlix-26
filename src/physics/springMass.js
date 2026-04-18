// Pure damped spring-mass (Hooke's law with linear damping).
// ODE: m x'' = -k x - c x'
// State: { x (m, displacement from equilibrium), v (m/s) }

function sp(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function nn(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function createSpringState(initialDisplacement = 0, initialVelocity = 0) {
  return {
    x: Number.isFinite(initialDisplacement) ? initialDisplacement : 0,
    v: Number.isFinite(initialVelocity) ? initialVelocity : 0,
  };
}

export function stepSpring(state, dt, params) {
  const m = sp(params.mass, 0.1);
  const k = sp(params.springConstant, 1);
  const c = nn(params.damping, 0);
  const clamped = Math.min(Math.max(dt, 0), 0.05);
  const subSteps = Math.max(1, Math.ceil(clamped / 0.005));
  const h = clamped / subSteps;
  for (let i = 0; i < subSteps; i++) {
    const a = (-k * state.x - c * state.v) / m;
    state.v += a * h;
    state.x += state.v * h;
  }
  return state;
}

export function springDerived(state, params) {
  const m = sp(params.mass, 0.1);
  const k = sp(params.springConstant, 1);
  const c = nn(params.damping, 0);
  const omega0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  const period = (2 * Math.PI) / omega0;
  const pe = 0.5 * k * state.x * state.x;
  const ke = 0.5 * m * state.v * state.v;
  return {
    naturalFrequency: omega0,
    dampingRatio: zeta,
    period,
    potentialEnergy: pe,
    kineticEnergy: ke,
    totalEnergy: pe + ke,
  };
}
