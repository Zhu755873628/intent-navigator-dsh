import { describe, expect, it } from 'vitest'
import { IntentNavigatorRuntime } from '../../src/runtime/navigator-runtime.js'
import { MemoryNavigationStore } from '../../src/store/memory-store.js'

const NOW = '2026-10-26T00:00:00.000Z'

describe('IntentNavigatorRuntime', () => {
  it('binds authorization to the exact task brief revision', async () => {
    const runtime = new IntentNavigatorRuntime(new MemoryNavigationStore(), () => NOW)
    await runtime.begin('session-1', 'Build a landing page')
    await runtime.saveBrief('session-1', {
      goal: 'Build a landing page',
      included: ['one responsive page'],
      excluded: ['backend'],
      deliverables: ['index.html'],
      acceptanceCriteria: ['renders at mobile and desktop widths'],
      unresolvedAssumptions: [],
    })

    const authorized = await runtime.authorize('session-1', 'explicit_user_confirmation')
    expect(authorized.stage).toBe('authorized')
    expect(authorized.authorization?.briefRevision).toBe(authorized.brief?.revision)

    const revised = await runtime.saveBrief('session-1', {
      goal: 'Build a landing page with a backend',
      included: ['responsive page', 'API'],
      excluded: [],
      deliverables: ['web app'],
      acceptanceCriteria: ['API persists submissions'],
      unresolvedAssumptions: [],
    })

    expect(revised.stage).toBe('awaiting_authorization')
    expect(revised.authorization).toBeUndefined()
  })

  it('rejects authorization when no task brief exists', async () => {
    const runtime = new IntentNavigatorRuntime(new MemoryNavigationStore(), () => NOW)
    await runtime.begin('session-1', 'Do something')

    await expect(runtime.authorize('session-1', 'explicit_user_confirmation')).rejects.toThrow(
      'Cannot authorize without a task brief',
    )
  })
})
