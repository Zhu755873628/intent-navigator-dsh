import { describe, expect, it } from 'vitest'
import { decideNextAction } from '../../src/domain/policy.js'
import type { IntentDiagnosis } from '../../src/domain/types.js'

function diagnosis(overrides: Partial<IntentDiagnosis> = {}): IntentDiagnosis {
  return {
    goalClarity: 'clear',
    informationSufficiency: 'sufficient',
    solutionAmbiguity: 'single_obvious',
    scopeSize: 'small',
    riskLevel: 'low',
    needsImplementationHelp: false,
    criticalUnknowns: [],
    assumptions: [],
    candidatePaths: [],
    ...overrides,
  }
}

describe('navigation policy', () => {
  it('fast-passes a clear low-risk explicitly authorized task', () => {
    expect(decideNextAction(diagnosis(), { originalInstructionAuthorizesExecution: true })).toBe(
      'fast_pass',
    )
  })

  it('clarifies before planning when critical information is missing', () => {
    expect(
      decideNextAction(
        diagnosis({
          informationSufficiency: 'missing_critical',
          solutionAmbiguity: 'multiple_meaningful',
          criticalUnknowns: [{ id: 'target', question: 'Which target?', impact: 'high' }],
        }),
        { originalInstructionAuthorizesExecution: true },
      ),
    ).toBe('clarify')
  })

  it('requires explicit confirmation for high-risk work', () => {
    expect(
      decideNextAction(diagnosis({ riskLevel: 'high' }), {
        originalInstructionAuthorizesExecution: true,
      }),
    ).toBe('prepare_brief')
  })
})
