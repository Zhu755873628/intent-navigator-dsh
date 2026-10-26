import { describe, expect, it } from 'vitest'
import { createNavigation, transition } from '../../src/domain/state-machine.js'

describe('navigation state machine', () => {
  it('creates an unseen navigation state', () => {
    const state = createNavigation('session-1', 'Build me a website', '2026-10-26T00:00:00.000Z')

    expect(state).toMatchObject({
      schemaVersion: 1,
      sessionId: 'session-1',
      revision: 0,
      stage: 'unseen',
      originalIntent: 'Build me a website',
    })
  })

  it('rejects a transition that skips task authorization', () => {
    const state = createNavigation('session-1', 'Build me a website', '2026-10-26T00:00:00.000Z')

    expect(() => transition(state, 'authorized', '2026-10-26T00:01:00.000Z')).toThrow(
      'Illegal navigation transition: unseen -> authorized',
    )
  })
})
