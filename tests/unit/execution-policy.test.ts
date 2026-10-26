import { describe, expect, it } from 'vitest'
import { decideToolExecution } from '../../src/domain/execution-policy.js'

describe('execution authorization policy', () => {
  it('allows navigator tools before authorization', () => {
    expect(decideToolExecution('intent_status', 'diagnosing')).toEqual({ allowed: true })
  })

  it('allows configured read-only discovery before authorization', () => {
    expect(decideToolExecution('read_file', 'planning')).toEqual({ allowed: true })
  })

  it('denies side-effect tools before authorization with a recoverable reason', () => {
    expect(decideToolExecution('write_file', 'awaiting_authorization')).toEqual({
      allowed: false,
      reason:
        'Intent Navigator paused execution: the current task brief has not been authorized. Ask the user to confirm, modify, or cancel it.',
    })
  })

  it('allows ordinary tools after authorization', () => {
    expect(decideToolExecution('write_file', 'authorized')).toEqual({ allowed: true })
  })

  it('fails closed for unknown tools before authorization', () => {
    expect(decideToolExecution('third_party_magic', 'diagnosing')).toMatchObject({ allowed: false })
  })
})
