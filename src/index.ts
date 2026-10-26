import type { Context } from '@deepseek-ai/cordis'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent'
import { createUserMessage, type UserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool, type PreToolDecision } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-tools'
import { decideToolExecution } from './domain/execution-policy.js'
import type { TaskBriefInput } from './domain/state-machine.js'
import { IntentNavigatorRuntime } from './runtime/navigator-runtime.js'
import { MemoryNavigationStore } from './store/memory-store.js'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'intent-navigator': { readonly kind: 'intent-navigator' }
  }
}

export const name = 'intent-navigator'
export const inject = ['agents', 'systemPrompt', 'tools']

const POLICY = `Use Intent Navigator before executing a new task.
- Diagnose goal clarity, critical unknowns, solution ambiguity, scope, and risk.
- Fast-pass simple, explicit, low-risk tasks without unnecessary questions.
- Ask only the most important unresolved question at a time.
- Never present an assumption as a confirmed requirement.
- Preparing a task brief does not authorize execution.
- Before side-effecting tools, ensure the current brief is authorized.`

function textOf(message: UserMessage): string {
  return message.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim()
}

function sessionIdOf(agent: Agent): string {
  return String(agent.session.header.id)
}

function parseBrief(value: string): TaskBriefInput {
  const parsed: unknown = JSON.parse(value)
  if (typeof parsed !== 'object' || parsed === null) throw new Error('brief_json must be an object')
  const record = parsed as Record<string, unknown>
  const stringArray = (key: string): string[] => {
    const candidate = record[key]
    if (!Array.isArray(candidate) || candidate.some((item) => typeof item !== 'string')) {
      throw new Error(`${key} must be an array of strings`)
    }
    return candidate
  }
  if (typeof record.goal !== 'string' || record.goal.trim().length === 0) {
    throw new Error('goal must be a non-empty string')
  }
  return {
    goal: record.goal,
    included: stringArray('included'),
    excluded: stringArray('excluded'),
    deliverables: stringArray('deliverables'),
    acceptanceCriteria: stringArray('acceptanceCriteria'),
    unresolvedAssumptions: stringArray('unresolvedAssumptions'),
  }
}

function renderState(state: Awaited<ReturnType<IntentNavigatorRuntime['get']>>): string {
  if (state === undefined) return JSON.stringify({ stage: 'unseen' })
  return JSON.stringify({
    stage: state.stage,
    revision: state.revision,
    brief: state.brief,
    authorization: state.authorization,
  })
}

function requireAgent(agent: Agent | undefined): Agent {
  if (agent === undefined) throw new Error('Intent Navigator tools require an agent-bound session')
  return agent
}

function createStatusTool(runtime: IntentNavigatorRuntime) {
  return defineTool({
    name: 'intent_status',
    description: 'Read the current intent-navigation stage, task brief, and authorization.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(_args, exec) {
      return renderState(await runtime.get(sessionIdOf(requireAgent(exec.agent))))
    },
  })
}

function createPrepareBriefTool(runtime: IntentNavigatorRuntime) {
  return defineTool({
    name: 'intent_prepare_brief',
    description:
      'Create or revise a task brief. This produces a preview and does not authorize execution.',
    parameters: {
      brief_json: {
        type: 'string',
        required: true,
        description:
          'JSON object with goal, included, excluded, deliverables, acceptanceCriteria, and unresolvedAssumptions.',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const agent = requireAgent(exec.agent)
      const sessionId = sessionIdOf(agent)
      const brief = parseBrief(args.brief_json)
      if ((await runtime.get(sessionId)) === undefined) await runtime.begin(sessionId, brief.goal)
      return renderState(await runtime.saveBrief(sessionId, brief))
    },
  })
}

function createAuthorizeTool(runtime: IntentNavigatorRuntime) {
  return defineTool({
    name: 'intent_authorize',
    description:
      'Record authorization for the current task-brief revision only after direct user confirmation.',
    parameters: {
      kind: {
        type: 'string',
        required: true,
        enum: ['explicit_user_confirmation', 'explicit_original_instruction'],
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const agent = requireAgent(exec.agent)
      return renderState(await runtime.authorize(sessionIdOf(agent), args.kind))
    },
  })
}

export function apply(ctx: Context): void {
  const runtime = new IntentNavigatorRuntime(new MemoryNavigationStore())

  ctx.systemPrompt.section({
    name: 'intent-navigator:policy',
    order: 450,
    text: POLICY,
    interpolate: false,
  })

  ctx.tools.register(createStatusTool(runtime))
  ctx.tools.register(createPrepareBriefTool(runtime))
  ctx.tools.register(createAuthorizeTool(runtime))

  ctx.on(
    'agent/pre-step',
    async (payload, next): Promise<PreStepDecision> => {
      const decision = await next()
      if (decision.kind === 'reject' || payload.signal.aborted) return decision
      const sessionId = String(payload.agent.session.header.id)
      let state = await runtime.get(sessionId)
      if (state === undefined) {
        const direct = payload.messages.find((message) => message.source.kind === 'user')
        if (direct === undefined) return decision
        state = await runtime.begin(sessionId, textOf(direct))
      }
      const message = createUserMessage({
        content: [
          {
            type: 'text',
            text: `<intent-navigation>${renderState(state)}</intent-navigation>`,
          },
        ],
        source: { kind: 'intent-navigator' },
      })
      return { ...decision, messages: [...decision.messages, message] }
    },
    { prepend: true },
  )

  ctx.on('tools/pre-execute', async (execution, next): Promise<PreToolDecision> => {
    const agent = execution.agent
    if (agent === undefined) return next()
    const state = await runtime.get(String(agent.session.header.id))
    const verdict = decideToolExecution(execution.name, state?.stage ?? 'unseen')
    if (!verdict.allowed) return { kind: 'deny', reason: verdict.reason }
    return next()
  })
}

const plugin = { name, inject, apply }
export default plugin

export { IntentNavigatorRuntime } from './runtime/navigator-runtime.js'
export { MemoryNavigationStore } from './store/memory-store.js'
export * from './domain/state-machine.js'
export * from './domain/policy.js'
export * from './domain/execution-policy.js'
export * from './domain/types.js'
