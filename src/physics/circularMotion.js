// Pure uniform circular motion analytics.

function sp(v, f) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : f; }
function nz(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export function circularMotion({ radius, speed, mass }) {
  const r = sp(radius, 1);
  const v = Math.max(0, nz(speed, 0));
  const m = sp(mass, 1);
  const omega = v / r;
  const period = v > 0 ? (2 * Math.PI * r) / v : Infinity;
  const frequency = Number.isFinite(period) ? 1 / period : 0;
  const centripetalAcceleration = (v * v) / r;
  const centripetalForce = m * centripetalAcceleration;
  return { r, v, m, omega, period, frequency, centripetalAcceleration, centripetalForce };
}

export function positionOnCircle(radius, omega, t, phase = 0) {
  const r = sp(radius, 1);
  const w = nz(omega, 0);
  const angle = w * nz(t, 0) + nz(phase, 0);
  return { x: r * Math.cos(angle), y: r * Math.sin(angle), angle };
}
