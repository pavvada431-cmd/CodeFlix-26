// Boundary sanitizer for simulation props.
// Every simulation should funnel its raw variables through `sanitizeSimProps`
// before they reach physics math or render state. Goal: prevent NaN, Infinity,
// negative-where-invalid, and out-of-range values from ever entering an
// animation loop where they are extremely hard to debug.

const FALLBACK = Symbol('fallback');

function finite(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const coerced = Number(value);
  if (Number.isFinite(coerced)) return coerced;
  return fallback;
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Per-key bounds & defaults. Keys are compared case-insensitively with a
// handful of common aliases. Add more as simulations evolve.
// Schema: min, max, default, strictlyPositive?, aliases?
const VARIABLE_SCHEMA = {
  mass:            { min: 1e-6, max: 1e6,  default: 1,    strictlyPositive: true,
                     aliases: ['m', 'm1', 'm2', 'mass1', 'mass2', 'objectmass'] },
  velocity:        { min: 0,    max: 1000, default: 10,
                     aliases: ['v', 'v0', 'v1', 'v2', 'speed', 'initialvelocity', 'initialspeed'] },
  angle:           { min: 0,    max: 89,   default: 45,
                     aliases: ['theta', 'phi', 'launchangle', 'inclineangle', 'inclinationangle', 'slopeangle'] },
  angleRad:        { min: 0,    max: Math.PI / 2, default: Math.PI / 4 },
  height:          { min: 0,    max: 1e5,  default: 2,
                     aliases: ['h', 'h0', 'initialheight', 'dropheight'] },
  length:          { min: 1e-3, max: 1e4,  default: 1,    strictlyPositive: true,
                     aliases: ['l', 'rodlength', 'stringlength', 'pendulumlength'] },
  radius:          { min: 1e-3, max: 1e9,  default: 1,    strictlyPositive: true,
                     aliases: ['r', 'r0'] },
  time:            { min: 0,    max: 1e6,  default: 1,
                     aliases: ['t', 'duration', 'halflife', 'half_life'] },
  period:          { min: 1e-6, max: 1e6,  default: 1,    strictlyPositive: true,
                     aliases: ['t_period'] },
  frequency:       { min: 0,    max: 1e9,  default: 1,
                     aliases: ['f', 'freq'] },
  gravity:         { min: 1e-3, max: 100,  default: 9.81, strictlyPositive: true,
                     aliases: ['g'] },
  friction:        { min: 0,    max: 5,    default: 0.3,
                     aliases: ['mu', 'μ', 'frictioncoefficient', 'coefficient', 'coefficientoffriction'] },
  springConstant:  { min: 1e-6, max: 1e6,  default: 50,   strictlyPositive: true,
                     aliases: ['k', 'spring_k', 'stiffness'] },
  amplitude:       { min: 0,    max: 1e4,  default: 1,
                     aliases: ['a', 'amp'] },
  wavelength:      { min: 1e-6, max: 1e6,  default: 1,    strictlyPositive: true,
                     aliases: ['lambda', 'λ'] },
  temperature:     { min: 1,    max: 1e6,  default: 300,  strictlyPositive: true,
                     aliases: ['temp', 'tempK', 'tempkelvin'] },
  pressure:        { min: 1e-6, max: 1e12, default: 101325, strictlyPositive: true,
                     aliases: ['p'] },
  volume:          { min: 1e-9, max: 1e9,  default: 1,    strictlyPositive: true,
                     aliases: ['vol', 'v_volume'] },
  charge:          { min: -1e6, max: 1e6,  default: 1e-6 },
  voltage:         { min: -1e9, max: 1e9,  default: 5 },
  current:         { min: -1e6, max: 1e6,  default: 1 },
  resistance:      { min: 1e-9, max: 1e12, default: 100,  strictlyPositive: true,
                     aliases: ['r_ohm', 'ohm', 'ohms'] },
  pH:              { min: 0,    max: 14,   default: 7, aliases: ['ph'] },
  molarity:        { min: 0,    max: 1e3,  default: 1 },
  moles:           { min: 0,    max: 1e6,  default: 1, aliases: ['n'] },
  concentration:   { min: 0,    max: 1e3,  default: 1,
                     aliases: ['conc'] },
  focalLength:     { min: -1e4, max: 1e4,  default: 10, aliases: ['focal', 'f_lens', 'f_mirror'] },
  objectDistance:  { min: 1e-3, max: 1e4,  default: 20, strictlyPositive: true, aliases: ['do', 'd_object'] },
  elasticity:      { min: 0,    max: 1,    default: 1, aliases: ['restitution', 'e_restitution', 'coefficientofrestitution'] },
};

// Build one flat lookup table from canonical name -> schema and alias -> schema.
const LOOKUP = (() => {
  const map = new Map();
  for (const [canon, schema] of Object.entries(VARIABLE_SCHEMA)) {
    map.set(canon.toLowerCase(), schema);
    for (const alias of schema.aliases || []) {
      map.set(alias.toLowerCase(), schema);
    }
  }
  return map;
})();

function schemaFor(key) {
  return LOOKUP.get(String(key).toLowerCase()) || null;
}

function sanitizeOne(key, value, warnings) {
  const schema = schemaFor(key);
  if (!schema) {
    // Unknown key — still strip NaN/Infinity but don't bound.
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        warnings.push(`"${key}" was non-finite (${value}), coerced to 0`);
        return 0;
      }
    }
    return value;
  }

  const raw = finite(value, FALLBACK);
  if (raw === FALLBACK) {
    warnings.push(`"${key}" missing or non-numeric, using default ${schema.default}`);
    return schema.default;
  }

  let v = raw;
  if (schema.strictlyPositive && v <= 0) {
    warnings.push(`"${key}" must be > 0 (got ${v}), using default ${schema.default}`);
    v = schema.default;
  }
  const clamped = clamp(v, schema.min, schema.max);
  if (clamped !== v) {
    warnings.push(`"${key}" clamped from ${v} to ${clamped}`);
  }
  return clamped;
}

// Main entry point. Returns a shallow copy of `props` with numeric values
// sanitized according to the schema. Non-numeric fields pass through.
// `warnings` is populated for diagnostic toasts / dev logs.
export function sanitizeSimProps(props, { warnings } = { warnings: [] }) {
  if (!props || typeof props !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function' || value == null) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'number') {
      out[key] = sanitizeOne(key, value, warnings);
      continue;
    }
    out[key] = value;
  }
  return out;
}

// Utility for inline use inside physics math: always produce a safe finite
// number. Prefer this over bare `Number(x) || 0` patterns scattered in sims.
export function safeNum(value, fallback = 0) {
  return finite(value, fallback);
}

export function safePositive(value, fallback = 1) {
  const n = finite(value, fallback);
  return n > 0 ? n : fallback;
}
