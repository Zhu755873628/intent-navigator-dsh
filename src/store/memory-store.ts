import type { NavigationState } from '../domain/state-machine.js'
import type { NavigationStore } from './navigation-store.js'

export class MemoryNavigationStore implements NavigationStore {
  readonly #states = new Map<string, NavigationState>()

  async get(sessionId: string): Promise<NavigationState | undefined> {
    return this.#states.get(sessionId)
  }

  async put(state: NavigationState): Promise<void> {
    this.#states.set(state.sessionId, state)
  }
}
