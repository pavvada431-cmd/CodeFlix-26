// Pure inclined-plane analytical physics. Returns the core quantities needed
// for both HUD display and for driving the Matter.js world.
// Axis convention: x-parallel (down-slope positive), y-perpendicular to slope.

export const GRAVITY = 9.81;

function clampFinite(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// angleDeg: incline angle (0 - 89 degrees)
// mass: kg
// friction: kinetic coefficient of friction (0 - ~2)
export function inclinedPlaneForces({ mass, angleDeg, friction, gravity = GRAVITY }) {
  const m = Math.max(1e-6, clampFinite(mass, 1));
  const angle = Math.min(89, Math.max(0, clampFinite(angleDeg, 0)));
  const mu = Math.max(0, clampFinite(friction, 0));
  const g = Math.max(1e-6, clampFinite(gravity, GRAVITY));

  const theta = (angle * Math.PI) / 180;
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  const weight = m * g;
  const parallel = weight * sin;
  const normal = weight * cos;
  const maxStaticFriction = mu * normal;
  const frictionForce = Math.min(parallel, maxStaticFriction);
  const netForce = parallel - frictionForce;
  const acceleration = netForce / m;
  const slides = parallel > maxStaticFriction;
  return {
    theta, sin, cos,
    weight, parallel, normal,
    frictionForce, maxStaticFriction,
    netForce, acceleration, slides,
  };
}

// Distance along ramp as a function of time under constant slope-acceleration.
export function slopePosition(acceleration, t) {
  const a = clampFinite(acceleration, 0);
  const time = Math.max(0, clampFinite(t, 0));
  return 0.5 * a * time * time;
}
