export type RiskLevel = 'low' | 'medium' | 'high'

export interface UnknownItem {
  readonly id: string
  readonly question: string
  readonly impact: RiskLevel
}

export interface Assumption {
  readonly statement: string
  readonly impact: RiskLevel
}

export interface CandidatePath {
  readonly name: string
  readonly summary: string
  readonly tradeoffs: readonly string[]
}

export interface IntentDiagnosis {
  readonly goalClarity: 'clear' | 'partial' | 'unclear'
  readonly informationSufficiency: 'sufficient' | 'missing_critical' | 'missing_optional'
  readonly solutionAmbiguity: 'single_obvious' | 'multiple_meaningful' | 'unknown'
  readonly scopeSize: 'small' | 'moderate' | 'too_large'
  readonly riskLevel: RiskLevel
  readonly needsImplementationHelp: boolean
  readonly criticalUnknowns: readonly UnknownItem[]
  readonly assumptions: readonly Assumption[]
  readonly candidatePaths: readonly CandidatePath[]
}

export type RecommendedAction =
  | 'fast_pass'
  | 'clarify'
  | 'explore_goal'
  | 'compare_paths'
  | 'split_scope'
  | 'prepare_brief'
