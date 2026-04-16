import Matter from 'matter-js'

// Prepared for future rigid-body experiments that complement the analytic solver.
export function createMatterBridge() {
  return Matter.Engine.create({ enableSleeping: true })
}
