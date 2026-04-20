import { describe, expect, it } from 'vitest'

import { classifyRepo } from '../scripts/classify-stars.mjs'

describe('classifyRepo', () => {
  it('classifies ai repos from topics and description', () => {
    const category = classifyRepo({
      name: 'claude-code',
      full_name: 'anthropic/claude-code',
      description: 'Agentic coding assistant',
      topics: ['ai', 'agent'],
      language: 'TypeScript'
    })

    expect(category).toBe('AI / LLM')
  })

  it('falls back to misc when nothing matches', () => {
    const category = classifyRepo({
      name: 'unknown-tool',
      full_name: 'foo/unknown-tool',
      description: 'Something unrelated',
      topics: [],
      language: 'Lua'
    })

    expect(category).toBe('Misc')
  })
})
