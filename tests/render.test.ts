import { describe, expect, it } from 'vitest'

import { renderApp } from '../src/render'
import type { StarsPayload } from '../src/types'

const payload: StarsPayload = {
  generatedAt: '2026-04-20T00:00:00.000Z',
  total: 2,
  categories: ['AI / LLM', 'Automation'],
  repos: [
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
      topics: ['automation'],
      updatedAt: '2026-04-18T00:00:00.000Z',
      createdAt: '2026-04-02T00:00:00.000Z',
      starredAt: '2026-04-18T00:00:00.000Z',
      category: 'Automation',
      autoCategory: 'Automation',
      hidden: false,
      pinned: false,
      note: '',
      weight: 0
    }
  ]
}

describe('renderApp', () => {
  it('renders summary stats and repo sections', () => {
    const root = document.createElement('div')

    renderApp(root, payload)

    expect(root.textContent).toContain('GitHub Stars Hub')
    expect(root.textContent).toContain('总计 2 个收藏')
    expect(root.textContent).toContain('anthropic/claude-code')
    expect(root.textContent).toContain('Automation')
  })

  it('adds accessible labels to toolbar controls', () => {
    const root = document.createElement('div')

    renderApp(root, payload)

    expect(root.querySelector('#query')?.getAttribute('aria-label')).toBe('搜索仓库')
    expect(root.querySelector('#category')?.getAttribute('aria-label')).toBe('按分类筛选')
    expect(root.querySelector('#language')?.getAttribute('aria-label')).toBe('按语言筛选')
    expect(root.querySelector('#sort')?.getAttribute('aria-label')).toBe('排序方式')
  })
})
