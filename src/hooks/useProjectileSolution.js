import { useDeferredValue } from 'react'
import { calculateProjectileSolution } from '../simulations/projectileMath'

function useProjectileSolution(problem) {
  const deferredProblem = useDeferredValue(problem)
  return calculateProjectileSolution(deferredProblem)
}

export default useProjectileSolution
