import type { NavigationState } from '../domain/state-machine.js'

export interface NavigationStore {
  get(sessionId: string): Promise<NavigationState | undefined>
  put(state: NavigationState): Promise<void>
}
