// Pure 1D elastic / inelastic two-body collision.
// m1, m2 (kg), u1, u2 (m/s), e = coefficient of restitution [0..1]

function sp(v, f) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : f; }
function nz(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export function collide1D({ mass1, mass2, u1, u2, restitution = 1 }) {
  const m1 = sp(mass1, 1);
  const m2 = sp(mass2, 1);
  const a = nz(u1, 0);
  const b = nz(u2, 0);
  const e = Math.min(1, Math.max(0, nz(restitution, 1)));
  const totalMass = m1 + m2;
  const v1 = (m1 * a + m2 * b - m2 * e * (a - b)) / totalMass;
  const v2 = (m1 * a + m2 * b + m1 * e * (a - b)) / totalMass;
  const keBefore = 0.5 * m1 * a * a + 0.5 * m2 * b * b;
  const keAfter = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  const momentumBefore = m1 * a + m2 * b;
  const momentumAfter = m1 * v1 + m2 * v2;
  return {
    v1, v2,
    kineticEnergyBefore: keBefore,
    kineticEnergyAfter: keAfter,
    energyLost: keBefore - keAfter,
    momentumBefore,
    momentumAfter,
  };
}
