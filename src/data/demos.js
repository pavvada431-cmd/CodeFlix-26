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
    id: 'spring-mass-shm',
    label: 'Spring-Mass Oscillator',
    problemText: 'A 2kg mass attached to a spring with k=50 N/m is pulled down 0.5m and released. Find the period and total energy.',
    parsedData: {
      domain: 'physics',
      type: 'spring_mass',
      variables: {
        springConstant: 50,
        mass: 2,
        initialDisplacement: 0.5,
        damping: 0,
      },
      units: {
        springConstant: 'N/m',
        mass: 'kg',
        initialDisplacement: 'm',
        damping: 'coefficient',
      },
      formula: 'T = 2π√(m/k) = 2π√(2/50) = 1.256 s',
      steps: [
        'Angular frequency: ω = √(k/m) = √(50/2) = 5 rad/s',
        'Period: T = 2π/ω = 2π/5 = 1.26 s',
        'Frequency: f = 1/T = 0.796 Hz',
        'Total mechanical energy: E = ½kA² = ½ × 50 × 0.5² = 6.25 J',
        'Maximum velocity: v_max = ωA = 5 × 0.5 = 2.5 m/s',
      ],
      answer: {
        value: 1.256,
        unit: 's',
        explanation: 'The mass oscillates with a period of 1.26 seconds. The total mechanical energy is 6.25 J, which remains constant (undamped case).',
      },
    },
  },
  {
    id: 'circular-motion-demo',
    label: 'Circular Motion',
    problemText: 'A 1kg mass moves in a circular path with radius 2m at angular velocity 3 rad/s. Find the centripetal force required.',
    parsedData: {
      domain: 'physics',
      type: 'circular_motion',
      variables: {
        radius: 2,
        mass: 1,
        angularVelocity: 3,
      },
      units: {
        radius: 'm',
        mass: 'kg',
        angularVelocity: 'rad/s',
      },
      formula: 'Fc = mω²r = 1 × 3² × 2 = 18 N',
      steps: [
        'Linear speed: v = ωr = 3 × 2 = 6 m/s',
        'Centripetal acceleration: ac = v²/r = 6²/2 = 18 m/s²',
        'Centripetal force: Fc = mac = 1 × 18 = 18 N',
        'The force always points toward the center of the circle',
        'Period: T = 2π/ω = 2π/3 = 2.09 s',
      ],
      answer: {
        value: 18,
        unit: 'N',
        explanation: 'The centripetal force required is 18 N, always directed toward the center of the circular path.',
      },
    },
  },
  {
    id: 'elastic-collision',
    label: 'Elastic Collision',
    problemText: 'A 2kg ball moving at 5 m/s collides elastically with a stationary 2kg ball. Find their velocities after collision.',
    parsedData: {
      domain: 'physics',
      type: 'collisions',
      variables: {
        mass1: 2,
        mass2: 2,
        velocity1: 5,
        velocity2: 0,
        collisionType: 'elastic',
      },
      units: {
        mass1: 'kg',
        mass2: 'kg',
        velocity1: 'm/s',
        velocity2: 'm/s',
      },
      formula: 'v1\' = 0, v2\' = 5 m/s (equal mass exchange)',
      steps: [
        'Initial momentum: p = 2×5 + 2×0 = 10 kg·m/s',
        'Initial KE: KE = ½×2×5² + ½×2×0² = 25 J',
        'For equal masses in elastic collision: velocities swap',
        'Final velocity of ball 1: v1\' = 0 m/s',
        'Final velocity of ball 2: v2\' = 5 m/s',
        'Total momentum conserved: 10 = 10 kg·m/s ✓',
        'Total KE conserved: 25 = 25 J ✓',
      ],
      answer: {
        value: 5,
        unit: 'm/s',
        explanation: 'In an elastic collision between equal masses, they exchange velocities. The moving ball stops and the stationary ball moves off with the original velocity.',
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
