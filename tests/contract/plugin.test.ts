import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import intentNavigator from '../../src/index.js'

describe('DSH plugin contract', () => {
  it('registers navigation tools and prompt policy for its lifetime', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt, {})
    await ctx.plugin(ToolRuntime, {})
    await ctx.plugin(AgentRegistry)
    const fiber = await ctx.plugin(intentNavigator)

    expect(ctx.tools.get('intent_status')).toBeDefined()
    expect(ctx.tools.get('intent_prepare_brief')).toBeDefined()
    expect(ctx.tools.get('intent_authorize')).toBeDefined()

    const assembly = await ctx.systemPrompt.assemble()
    expect(assembly.sections.some((section) => section.name === 'intent-navigator:policy')).toBe(true)

    await fiber.dispose()
    expect(ctx.tools.get('intent_status')).toBeUndefined()
  })
})
