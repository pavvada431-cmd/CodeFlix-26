export const DEMO_PROBLEMS = [
  {
    id: 'inclined-plane-basic',
    label: 'Inclined Plane',
    problemText: 'A 10kg block slides down a 30-degree frictionless incline. Find its acceleration and the normal force.',
    parsedData: {
      domain: 'physics',
      type: 'inclined_plane',
      variables: {
        mass: 10,
        angle: 30,
        friction: 0,
      },
      units: {
        mass: 'kg',
        angle: 'degrees',
        friction: 'coefficient',
      },
      formula: 'a = g × sin(θ) = 9.81 × sin(30°) = 4.905 m/s²',
      steps: [
        'Identify forces: weight (mg) acts vertically downward',
        'Resolve weight into components parallel and perpendicular to the incline',
        'Perpendicular component: N = mg × cos(30°) = 84.87 N',
        'Parallel component: mg × sin(30°) = 49.05 N causes acceleration',
        'Since friction = 0, net force = mg × sin(30°)',
        'Apply Newton\'s second law: a = F/m = 49.05/10 = 4.905 m/s²',
      ],
      answer: {
        value: 4.905,
        unit: 'm/s²',
        explanation: 'The block accelerates at 4.905 m/s² down the incline, with a normal force of 84.87 N perpendicular to the surface.',
      },
    },
  },
  {
    id: 'projectile-range',
    label: 'Projectile Motion',
    problemText: 'A ball is launched at 20 m/s at an angle of 45 degrees from the ground. Find the range and time of flight.',
    parsedData: {
      domain: 'physics',
      type: 'projectile',
      variables: {
        velocity: 20,
        angle: 45,
        height: 0,
      },
      units: {
        velocity: 'm/s',
        angle: 'degrees',
        height: 'm',
      },
      formula: 'R = v₀² × sin(2θ) / g = 20² × sin(90°) / 9.81',
      steps: [
        'Decompose initial velocity: vₓ = v₀ × cos(45°) = 14.14 m/s',
        'Vertical component: vᵧ = v₀ × sin(45°) = 14.14 m/s',
        'Time of flight for level ground: t = 2vᵧ/g = 2(14.14)/9.81 = 2.88 s',
        'Maximum height: h = vᵧ²/(2g) = 14.14²/19.62 = 10.2 m',
        'Range: R = vₓ × t = 14.14 × 2.88 = 40.8 m',
      ],
      answer: {
        value: 40.8,
        unit: 'm',
        explanation: 'The ball travels approximately 40.8 meters horizontally before landing, with a total flight time of 2.88 seconds.',
      },
    },
  },
  {
    id: 'pendulum-period',
    label: 'Simple Pendulum',
    problemText: 'A simple pendulum has length 2 m. Calculate its period near Earth\'s surface.',
    parsedData: {
      domain: 'physics',
      type: 'pendulum',
      variables: {
        length: 2,
        mass: 1,
        angle: 15,
        damping: 0,
      },
      units: {
        length: 'm',
        mass: 'kg',
        angle: 'degrees',
        damping: 'coefficient',
      },
      formula: 'T = 2π√(L/g) = 2π√(2/9.81) = 2.837 s',
      steps: [
        'For small angles, period depends only on length and gravity',
        'Formula: T = 2π√(L/g)',
        'Substitute: L = 2 m, g = 9.81 m/s²',
        'T = 2π√(0.204) = 2π × 0.452 = 2.84 s',
        'Note: mass and amplitude don\'t affect the period for small angles',
      ],
      answer: {
        value: 2.84,
        unit: 's',
        explanation: 'The pendulum completes one full swing (back and forth) in approximately 2.84 seconds.',
      },
    },
  },
  {
    id: 'inclined-friction',
    label: 'Incline with Friction',
    problemText: 'A 5kg block slides down a 25-degree incline with coefficient of friction 0.3. Find the acceleration.',
    parsedData: {
      domain: 'physics',
      type: 'inclined_plane',
      variables: {
        mass: 5,
        angle: 25,
        friction: 0.3,
      },
      units: {
        mass: 'kg',
        angle: 'degrees',
        friction: 'coefficient',
      },
      formula: 'a = g(sin θ - μ cos θ) = 9.81(0.423 - 0.3 × 0.906) = 1.76 m/s²',
      steps: [
        'Calculate parallel component: F_parallel = mg × sin(25°) = 20.7 N',
        'Calculate normal force: N = mg × cos(25°) = 44.5 N',
        'Friction force: f = μN = 0.3 × 44.5 = 13.35 N',
        'Net force: F_net = F_parallel - f = 20.7 - 13.35 = 7.35 N',
        'Acceleration: a = F_net/m = 7.35/5 = 1.47 m/s²',
      ],
      answer: {
        value: 1.47,
        unit: 'm/s²',
        explanation: 'The block accelerates at 1.47 m/s² down the incline, significantly slower than the frictionless case.',
      },
    },
  },
  {
    id: 'projectile-high-launch',
    label: 'Projectile from Height',
    problemText: 'A stone is thrown from a 15m tall cliff at 25 m/s at 30 degrees above horizontal. Find the time to hit the ground and range.',
    parsedData: {
      domain: 'physics',
      type: 'projectile',
      variables: {
        velocity: 25,
        angle: 30,
        height: 15,
      },
      units: {
        velocity: 'm/s',
        angle: 'degrees',
        height: 'm',
      },
      formula: 'y = h + v₀ᵧt - ½gt² → solve quadratic for t',
      steps: [
        'Horizontal component: vₓ = 25 × cos(30°) = 21.65 m/s',
        'Vertical component: vᵧ = 25 × sin(30°) = 12.5 m/s',
        'Time to hit ground: solve 15 + 12.5t - 4.9t² = 0',
        'Using quadratic formula: t = 3.52 s (positive root)',
        'Horizontal distance: R = 21.65 × 3.52 = 76.2 m',
      ],
      answer: {
        value: 76.2,
        unit: 'm',
        explanation: 'The stone travels 76.2 meters horizontally and takes 3.52 seconds to reach the ground.',
      },
    },
  },
]

export const getDemoById = (id) => DEMO_PROBLEMS.find(demo => demo.id === id)

export const getRandomDemo = () => {
  const index = Math.floor(Math.random() * DEMO_PROBLEMS.length)
  return DEMO_PROBLEMS[index]
}
