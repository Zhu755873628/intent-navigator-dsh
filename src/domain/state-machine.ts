export type NavigationStage =
  | 'unseen'
  | 'diagnosing'
  | 'clarifying'
  | 'exploring'
  | 'planning'
  | 'brief_ready'
  | 'awaiting_authorization'
  | 'authorized'
  | 'handed_off'
  | 'cancelled'

export interface TaskBriefInput {
  readonly goal: string
  readonly included: readonly string[]
  readonly excluded: readonly string[]
  readonly deliverables: readonly string[]
  readonly acceptanceCriteria: readonly string[]
  readonly unresolvedAssumptions: readonly string[]
}

export interface TaskBrief extends TaskBriefInput {
  readonly id: string
  readonly revision: number
}

export interface AuthorizationRecord {
  readonly briefId: string
  readonly briefRevision: number
  readonly kind: 'explicit_user_confirmation' | 'explicit_original_instruction'
  readonly authorizedAt: string
}

export interface NavigationState {
  readonly schemaVersion: 1
  readonly sessionId: string
  readonly revision: number
  readonly stage: NavigationStage
  readonly originalIntent: string
  readonly brief?: TaskBrief
  readonly authorization?: AuthorizationRecord
  readonly createdAt: string
  readonly updatedAt: string
}

const ALLOWED_TRANSITIONS: Readonly<Record<NavigationStage, readonly NavigationStage[]>> = {
  unseen: ['diagnosing', 'cancelled'],
  diagnosing: ['clarifying', 'exploring', 'planning', 'brief_ready', 'handed_off', 'cancelled'],
  clarifying: ['diagnosing', 'cancelled'],
  exploring: ['diagnosing', 'cancelled'],
  planning: ['diagnosing', 'brief_ready', 'cancelled'],
  brief_ready: ['awaiting_authorization', 'diagnosing', 'cancelled'],
  awaiting_authorization: ['authorized', 'diagnosing', 'cancelled'],
  authorized: ['handed_off', 'diagnosing', 'cancelled'],
  handed_off: ['diagnosing', 'cancelled'],
  cancelled: ['diagnosing'],
}

export function createNavigation(
  sessionId: string,
  originalIntent: string,
  now: string,
): NavigationState {
  return {
    schemaVersion: 1,
    sessionId,
    revision: 0,
    stage: 'unseen',
    originalIntent,
    createdAt: now,
    updatedAt: now,
  }
}

export function transition(
  state: NavigationState,
  nextStage: NavigationStage,
  now: string,
): NavigationState {
  if (!ALLOWED_TRANSITIONS[state.stage].includes(nextStage)) {
    throw new Error(`Illegal navigation transition: ${state.stage} -> ${nextStage}`)
  }

  return {
    ...state,
    revision: state.revision + 1,
    stage: nextStage,
    updatedAt: now,
  }
}
