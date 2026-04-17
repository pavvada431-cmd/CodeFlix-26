/**
 * Backward-compatible exports for legacy imports.
 * New multi-concept stage implementations live in simulationStages.js.
 */

export {
  BaseSimulationStage as SimulationStage,
  InclinedPlaneStage,
  ProjectileStage,
  FreeFallStage,
  CollisionStage,
  SpringLaunchStage,
  createStage,
} from './simulationStages.js'

export default null
