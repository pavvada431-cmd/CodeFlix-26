// Pure projectile kinematics. No React, no Three, no rendering concerns.
// Inputs are assumed to already pass through the boundary sanitizer, but we
// defensively clamp anyway so that unit tests and ad-hoc callers can't
// produce NaN/Infinity mid-animation.

export const PROJECTILE_DEFAULT_GRAVITY = 9.81; // m/s²

function safe(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function nonNegative(value, fallback = 0) {
  const v = safe(value, fallback);
  return v < 0 ? 0 : v;
}

// Returns the core scalar quantities for an ideal projectile (no air drag).
// `launchAngleDeg` is in degrees; everything else SI.
export function solveProjectileKinematics(initialVelocity, launchAngleDeg, initialHeight, gravity = PROJECTILE_DEFAULT_GRAVITY) {
  const v0 = nonNegative(initialVelocity);
  const h0 = nonNegative(initialHeight);
  const g = Math.max(1e-6, safe(gravity, PROJECTILE_DEFAULT_GRAVITY));
  const angleRad = (safe(launchAngleDeg) * Math.PI) / 180;
  const vx = v0 * Math.cos(angleRad);
  const vy = v0 * Math.sin(angleRad);
  // Landing time from h0 with upward +y, gravity magnitude g:
  //   y(t) = h0 + vy t - 1/2 g t² = 0
  //   t_flight = (vy + √(vy² + 2 g h0)) / g
  const discriminant = Math.max(0, vy * vy + 2 * g * h0);
  const timeOfFlight = Math.max(0, (vy + Math.sqrt(discriminant)) / g);
  const timeToApex = vy > 0 ? vy / g : 0;
  const maxHeight = h0 + (vy > 0 ? (vy * vy) / (2 * g) : 0);
  const range = Math.max(0, vx * timeOfFlight);
  return { vx, vy, timeOfFlight, maxHeight, range, angleRad, timeToApex, gravity: g };
}

// Sample the trajectory as {x, y} points in metres. Callers can scale for
// rendering. Does NOT emit THREE.Vector3 on purpose.
export function sampleTrajectory(initialVelocity, launchAngleDeg, initialHeight, steps = 80, gravity = PROJECTILE_DEFAULT_GRAVITY) {
  const { vx, vy, timeOfFlight, gravity: g } = solveProjectileKinematics(
    initialVelocity, launchAngleDeg, initialHeight, gravity
  );
  const h0 = nonNegative(initialHeight);
  const out = new Array(steps + 1);
  for (let i = 0; i <= steps; i++) {
    const t = timeOfFlight > 0 ? (i / steps) * timeOfFlight : 0;
    const x = vx * t;
    const y = Math.max(0, h0 + vy * t - 0.5 * g * t * t);
    out[i] = { x, y, t };
  }
  return out;
}

// Graph/chart data over time (for UI plots).
export function buildProjectileGraph(initialVelocity, launchAngleDeg, initialHeight, sampleCount = 60, gravity = PROJECTILE_DEFAULT_GRAVITY) {
  const kin = solveProjectileKinematics(initialVelocity, launchAngleDeg, initialHeight, gravity);
  const { vx, vy, timeOfFlight, maxHeight, range, gravity: g } = kin;
  const h0 = nonNegative(initialHeight);
  return Array.from({ length: sampleCount + 1 }, (_, i) => {
    const t = timeOfFlight > 0 ? (i / sampleCount) * timeOfFlight : 0;
    const y = Math.max(0, h0 + vy * t - 0.5 * g * t * t);
    const vyT = vy - g * t;
    return {
      t,
      x_m: vx * t,
      y_m: y,
      vx_mps: vx,
      vy_mps: vyT,
      speed_mps: Math.hypot(vx, vyT),
      range_m: range,
      maxHeight_m: maxHeight,
    };
  });
}
