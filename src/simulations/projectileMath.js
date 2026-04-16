export const defaultProblem = Object.freeze({
  velocity: 32,
  angle: 48,
  height: 1.5,
  gravity: 9.81,
})

export const showcaseProblem = Object.freeze({
  velocity: 38,
  angle: 56,
  height: 2.2,
  gravity: 9.81,
})

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits))
}

function normalizeProblem(problem = defaultProblem) {
  return {
    velocity: clamp(Number(problem.velocity) || 0, 1, 120),
    angle: clamp(Number(problem.angle) || 0, 1, 89),
    height: clamp(Number(problem.height) || 0, 0, 30),
    gravity: clamp(Number(problem.gravity) || 0, 1, 24),
  }
}

export function calculateProjectileSolution(problem) {
  const normalizedProblem = normalizeProblem(problem)
  const angleRad = (normalizedProblem.angle * Math.PI) / 180
  const horizontalVelocity =
    normalizedProblem.velocity * Math.cos(angleRad)
  const verticalVelocity =
    normalizedProblem.velocity * Math.sin(angleRad)
  const discriminant = Math.max(
    verticalVelocity ** 2 + 2 * normalizedProblem.gravity * normalizedProblem.height,
    0,
  )
  const flightTime =
    (verticalVelocity + Math.sqrt(discriminant)) / normalizedProblem.gravity
  const apexTime = verticalVelocity / normalizedProblem.gravity
  const maxHeight =
    normalizedProblem.height +
    verticalVelocity ** 2 / (2 * normalizedProblem.gravity)
  const range = horizontalVelocity * flightTime
  const impactVelocityY = verticalVelocity - normalizedProblem.gravity * flightTime
  const impactSpeed = Math.sqrt(
    horizontalVelocity ** 2 + impactVelocityY ** 2,
  )
  const sampleCount = 36

  const samples = Array.from({ length: sampleCount }, (_, index) => {
    const time = flightTime * (index / (sampleCount - 1))
    const x = horizontalVelocity * time
    const y = Math.max(
      normalizedProblem.height +
        verticalVelocity * time -
        0.5 * normalizedProblem.gravity * time * time,
      0,
    )

    return {
      time: round(time),
      x: round(x),
      y: round(y),
    }
  })

  const sceneScale = Math.max(range / 12, maxHeight / 5.5, 1)
  const scenePoints = samples.map(({ x, y }) => [x / sceneScale, y / sceneScale, 0])

  const steps = [
    {
      title: 'Resolve the launch angle',
      detail:
        'Convert degrees to radians so the trigonometric projections use a consistent unit.',
      equation: `θ = ${normalizedProblem.angle}° = ${round(angleRad, 3)} rad`,
    },
    {
      title: 'Split the velocity vector',
      detail:
        'Project the launch speed into independent horizontal and vertical components.',
      equation: `vx = v·cos(θ) = ${round(horizontalVelocity)} m/s\nvy = v·sin(θ) = ${round(verticalVelocity)} m/s`,
    },
    {
      title: 'Solve the flight time',
      detail:
        'Set the vertical position equal to ground level and solve the quadratic for t.',
      equation: `t = (vy + √(vy² + 2gh₀)) / g = ${round(flightTime)} s`,
    },
    {
      title: 'Find the peak height',
      detail:
        'At the apex, the vertical velocity becomes zero, which gives the maximum height.',
      equation: `ymax = h₀ + vy² / (2g) = ${round(maxHeight)} m`,
    },
    {
      title: 'Compute the horizontal range',
      detail:
        'Horizontal motion remains constant, so distance traveled is vx multiplied by total flight time.',
      equation: `R = vx · t = ${round(range)} m`,
    },
  ]

  return {
    problem: normalizedProblem,
    angleRad,
    horizontalVelocity,
    verticalVelocity,
    flightTime,
    apexTime,
    maxHeight,
    range,
    impactSpeed,
    samples,
    scenePoints,
    sceneBounds: {
      range: range / sceneScale,
      height: maxHeight / sceneScale,
    },
    steps,
  }
}
