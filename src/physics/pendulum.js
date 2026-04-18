// Pure nonlinear damped pendulum dynamics. No React/Three.
// State: { theta (rad), omega (rad/s) }
// ODE:  θ'' = -(g/L) sinθ - b θ'
// Sub-stepped semi-implicit Euler — same scheme already used in Pendulum.jsx.

export const DEFAULT_GRAVITY = 9.81;

function safePositive(value, fallback) {
  const v = Number(value);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function safeNonNeg(value, fallback = 0) {
  const v = Number(value);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

export function createPendulumState(initialAngleDeg) {
  const a = Number.isFinite(Number(initialAngleDeg)) ? Number(initialAngleDeg) : 0;
  return { theta: (a * Math.PI) / 180, omega: 0 };
}

// Advance the pendulum by `dt` seconds. Mutates `state` for performance.
export function stepPendulum(state, dt, params) {
  const L = safePositive(params.length, 0.05);
  const b = safeNonNeg(params.damping, 0);
  const g = safePositive(params.gravity ?? DEFAULT_GRAVITY, DEFAULT_GRAVITY);
  const clamped = Math.min(Math.max(dt, 0), 0.05);
  const subSteps = Math.max(1, Math.ceil(clamped / 0.01));
  const h = clamped / subSteps;
  for (let i = 0; i < subSteps; i++) {
    const alpha = -(g / L) * Math.sin(state.theta) - b * state.omega;
    state.omega += alpha * h;
    state.theta += state.omega * h;
  }
  return state;
}

// Snapshot derived quantities for display/emission.
export function pendulumDerived(state, params) {
  const L = safePositive(params.length, 0.05);
  const m = safePositive(params.mass, 0.01);
  const b = safeNonNeg(params.damping, 0);
  const g = safePositive(params.gravity ?? DEFAULT_GRAVITY, DEFAULT_GRAVITY);
  const theta = state.theta;
  const omega = state.omega;
  const alpha = -(g / L) * Math.sin(theta) - b * omega;
  const tangentialVelocity = omega * L;
  const tangentialAcceleration = alpha * L;
  const radialAcceleration = omega * omega * L;
  const tangentForce = m * tangentialAcceleration;
  const centripetalForce = m * radialAcceleration;
  const tensionForce = Math.max(0, m * (g * Math.cos(theta) + radialAcceleration));
  const potentialEnergy = m * g * L * (1 - Math.cos(theta));
  const kineticEnergy = 0.5 * m * tangentialVelocity * tangentialVelocity;
  const smallAnglePeriod = 2 * Math.PI * Math.sqrt(L / g);
  const discriminant = Math.max(0, g / L - (b * b) / 4);
  const dampedOmega = discriminant > 0 ? Math.sqrt(discriminant) : 0;
  const dampedPeriod = dampedOmega > 1e-9 ? (2 * Math.PI) / dampedOmega : null;
  return {
    theta, omega, alpha,
    tangentialVelocity, tangentialAcceleration, radialAcceleration,
    tangentForce, centripetalForce, tensionForce,
    potentialEnergy, kineticEnergy, totalEnergy: kineticEnergy + potentialEnergy,
    smallAnglePeriod, dampedPeriod,
  };
}
