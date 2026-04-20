import { describe, expect, it } from 'vitest'

import { filterRepos } from '../src/filter'
import type { StarRepo } from '../src/types'

const repos: StarRepo[] = [
  {
    fullName: 'anthropic/claude-code',
    name: 'claude-code',
    owner: 'anthropic',
    url: 'https://github.com/anthropic/claude-code',
    description: 'Coding agent',
    homepage: '',
    language: 'TypeScript',
    stars: 1200,
    topics: ['ai', 'agent'],
    updatedAt: '2026-04-20T00:00:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
    starredAt: '2026-04-19T00:00:00.000Z',
    category: 'AI / LLM',
    autoCategory: 'AI / LLM',
    hidden: false,
    pinned: true,
    note: 'primary',
    weight: 10
  },
  {
    fullName: 'microsoft/playwright',
    name: 'playwright',
    owner: 'microsoft',
    url: 'https://github.com/microsoft/playwright',
    description: 'Browser automation',
    homepage: '',
    language: 'TypeScript',
    stars: 800,
    topics: ['automation', 'testing'],
    updatedAt: '2026-04-18T00:00:00.000Z',
    createdAt: '2026-04-02T00:00:00.000Z',
    starredAt: '2026-04-18T00:00:00.000Z',
    category: 'Automation',
    autoCategory: 'Automation',
    hidden: false,
    pinned: false,
    note: '',
    weight: 0
  },
  {
    fullName: 'hidden/repo',
    name: 'repo',
    owner: 'hidden',
    url: 'https://github.com/hidden/repo',
    description: 'Hidden repo',
    homepage: '',
    language: 'Python',
    stars: 10,
    topics: [],
    updatedAt: '2026-04-18T00:00:00.000Z',
    createdAt: '2026-04-02T00:00:00.000Z',
    starredAt: '2026-04-18T00:00:00.000Z',
    category: 'Misc',
    autoCategory: 'Misc',
    hidden: true,
    pinned: false,
    note: '',
    weight: 0
  }
]

describe('filterRepos', () => {
  it('hides hidden repos and keeps pinned items first', () => {
    const result = filterRepos(repos, {
      query: '',
      category: 'ALL',
      language: 'ALL',
      sort: 'stars'
    })

    expect(result.map((repo) => repo.fullName)).toEqual([
      'anthropic/claude-code',
      'microsoft/playwright'
    ])
  })

  it('searches across name description notes and topics', () => {
    const result = filterRepos(repos, {
      query: 'automation',
      category: 'ALL',
      language: 'ALL',
      sort: 'starred'
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.fullName).toBe('microsoft/playwright')
  })
})
