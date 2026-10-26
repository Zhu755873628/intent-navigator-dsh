import type { NavigationStage } from './state-machine.js'

export type ExecutionVerdict =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string }

const READ_ONLY_TOOLS = new Set([
  'read_file',
  'search_files',
  'web_search',
  'web_fetch',
  'intent_status',
  'ask_user_question',
])

const PAUSED_REASON =
  'Intent Navigator paused execution: the current task brief has not been authorized. Ask the user to confirm, modify, or cancel it.'

export function decideToolExecution(
  toolName: string,
  stage: NavigationStage,
): ExecutionVerdict {
  if (toolName.startsWith('intent_')) return { allowed: true }
  if (stage === 'authorized' || stage === 'handed_off') return { allowed: true }
  if (READ_ONLY_TOOLS.has(toolName)) return { allowed: true }
  return { allowed: false, reason: PAUSED_REASON }
}
