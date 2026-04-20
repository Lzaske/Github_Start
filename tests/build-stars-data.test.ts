import { describe, expect, it } from 'vitest'

import { buildStarsPayload } from '../scripts/build-stars-data.mjs'

describe('buildStarsPayload', () => {
  it('merges overrides into classified repositories', () => {
    const payload = buildStarsPayload(
      [
        {
          starred_at: '2026-04-20T00:00:00.000Z',
          repo: {
            full_name: 'microsoft/playwright',
            name: 'playwright',
            owner: { login: 'microsoft' },
            html_url: 'https://github.com/microsoft/playwright',
            description: 'Browser automation',
            homepage: '',
            language: 'TypeScript',
            stargazers_count: 800,
            topics: ['automation', 'testing'],
            updated_at: '2026-04-19T00:00:00.000Z',
            created_at: '2026-04-01T00:00:00.000Z'
          }
        }
      ],
      {
        'microsoft/playwright': {
          category: 'DevTools',
          pinned: true,
          note: 'UI testing stack',
          weight: 5
        }
      }
    )

    expect(payload.total).toBe(1)
    expect(payload.categories).toEqual(['DevTools'])
    expect(payload.repos[0]).toMatchObject({
      category: 'DevTools',
      autoCategory: 'Automation',
      pinned: true,
      note: 'UI testing stack',
      weight: 5
    })
  })

  it('ignores invalid override categories and keeps auto category', () => {
    const payload = buildStarsPayload(
      [
        {
          starred_at: '2026-04-20T00:00:00.000Z',
          repo: {
            full_name: 'anthropic/claude-code',
            name: 'claude-code',
            owner: { login: 'anthropic' },
            html_url: 'https://github.com/anthropic/claude-code',
            description: 'Coding agent',
            homepage: '',
            language: 'TypeScript',
            stargazers_count: 1200,
            topics: ['ai', 'agent'],
            updated_at: '2026-04-19T00:00:00.000Z',
            created_at: '2026-04-01T00:00:00.000Z'
          }
        }
      ],
      {
        'anthropic/claude-code': {
          category: 'Not Real'
        }
      }
    )

    expect(payload.categories).toEqual(['AI / LLM'])
    expect(payload.repos[0]?.category).toBe('AI / LLM')
  })
})
