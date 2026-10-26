import {
  createNavigation,
  transition,
  type AuthorizationRecord,
  type NavigationState,
  type TaskBrief,
  type TaskBriefInput,
} from '../domain/state-machine.js'
import type { NavigationStore } from '../store/navigation-store.js'

export type AuthorizationKind = AuthorizationRecord['kind']

export class IntentNavigatorRuntime {
  constructor(
    private readonly store: NavigationStore,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async begin(sessionId: string, originalIntent: string): Promise<NavigationState> {
    const existing = await this.store.get(sessionId)
    if (existing !== undefined) return existing
    const initial = transition(
      createNavigation(sessionId, originalIntent, this.now()),
      'diagnosing',
      this.now(),
    )
    await this.store.put(initial)
    return initial
  }

  async get(sessionId: string): Promise<NavigationState | undefined> {
    return this.store.get(sessionId)
  }

  async saveBrief(sessionId: string, input: TaskBriefInput): Promise<NavigationState> {
    const current = await this.requireState(sessionId)
    const brief: TaskBrief = {
      ...input,
      id: current.brief?.id ?? `brief:${sessionId}`,
      revision: (current.brief?.revision ?? 0) + 1,
    }

    let state = current
    if (state.stage !== 'diagnosing' && state.stage !== 'planning') {
      state = transition(state, 'diagnosing', this.now())
    }
    state = transition(state, 'brief_ready', this.now())
    state = transition(state, 'awaiting_authorization', this.now())
    const { authorization: _authorization, ...stateWithoutAuthorization } = state
    state = { ...stateWithoutAuthorization, brief }
    await this.store.put(state)
    return state
  }

  async authorize(sessionId: string, kind: AuthorizationKind): Promise<NavigationState> {
    const current = await this.requireState(sessionId)
    if (current.brief === undefined) throw new Error('Cannot authorize without a task brief')
    if (current.stage !== 'awaiting_authorization') {
      throw new Error(`Cannot authorize from stage ${current.stage}`)
    }

    const authorization: AuthorizationRecord = {
      briefId: current.brief.id,
      briefRevision: current.brief.revision,
      kind,
      authorizedAt: this.now(),
    }
    const state = { ...transition(current, 'authorized', this.now()), authorization }
    await this.store.put(state)
    return state
  }

  private async requireState(sessionId: string): Promise<NavigationState> {
    const state = await this.store.get(sessionId)
    if (state === undefined) throw new Error(`Unknown navigation session: ${sessionId}`)
    return state
  }
}
