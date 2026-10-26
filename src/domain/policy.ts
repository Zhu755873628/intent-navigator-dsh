import type { IntentDiagnosis, RecommendedAction } from './types.js'

export interface PolicyContext {
  readonly originalInstructionAuthorizesExecution: boolean
}

export function decideNextAction(
  diagnosis: IntentDiagnosis,
  context: PolicyContext,
): RecommendedAction {
  if (
    diagnosis.informationSufficiency === 'missing_critical' ||
    diagnosis.criticalUnknowns.some((item) => item.impact === 'high')
  ) {
    return 'clarify'
  }

  if (diagnosis.goalClarity === 'unclear' || diagnosis.goalClarity === 'partial') {
    return 'explore_goal'
  }

  if (diagnosis.scopeSize === 'too_large') return 'split_scope'
  if (diagnosis.solutionAmbiguity === 'multiple_meaningful') return 'compare_paths'

  const canFastPass =
    context.originalInstructionAuthorizesExecution &&
    diagnosis.informationSufficiency === 'sufficient' &&
    diagnosis.solutionAmbiguity === 'single_obvious' &&
    diagnosis.riskLevel === 'low'

  return canFastPass ? 'fast_pass' : 'prepare_brief'
}
