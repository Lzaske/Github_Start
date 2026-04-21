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
      descriptionZh: '编程智能体',
      translationStatus: 'translated',
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
      descriptionZh: '',
      translationStatus: 'fallback',
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

    expect(root.textContent).toContain('GitHub Stars 收藏夹')
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
    expect(root.textContent).toContain('仓库作者：anthropic')
    expect(root.textContent).toContain('星标索引')
  })

  it('defaults to zh descriptions and falls back to original when translation is missing', () => {
    const root = document.createElement('div')

    renderApp(root, payload)

    const descriptions = Array.from(root.querySelectorAll('.repo-description')).map((node) => node.textContent)

    expect(root.querySelector('#description-mode')?.getAttribute('aria-label')).toBe('描述显示模式')
    expect((root.querySelector('#description-mode') as HTMLSelectElement | null)?.value).toBe('zh')
    expect(descriptions).toContain('编程智能体')
    expect(descriptions).toContain('Browser automation')
  })

  it('switches repo cards to original descriptions without affecting search behavior', () => {
    const root = document.createElement('div')

    renderApp(root, payload)

    const mode = root.querySelector('#description-mode') as HTMLSelectElement | null
    expect(mode).not.toBeNull()
    mode!.value = 'original'
    mode!.dispatchEvent(new Event('change', { bubbles: true }))

    const descriptions = Array.from(root.querySelectorAll('.repo-description')).map((node) => node.textContent)
    expect(descriptions).toContain('Coding agent')
    expect(descriptions).toContain('Browser automation')
    expect(root.textContent).not.toContain('编程智能体')

    const query = root.querySelector('#query') as HTMLInputElement | null
    expect(query).not.toBeNull()
    query!.value = 'coding agent'
    query!.dispatchEvent(new Event('input', { bubbles: true }))

    expect(root.textContent).toContain('anthropic/claude-code')
    expect(root.textContent).not.toContain('microsoft/playwright')
    expect(root.textContent).toContain('Coding agent')
  })

  it('keeps chinese search working when original descriptions are displayed', () => {
    const root = document.createElement('div')

    renderApp(root, payload)

    const mode = root.querySelector('#description-mode') as HTMLSelectElement | null
    expect(mode).not.toBeNull()
    mode!.value = 'original'
    mode!.dispatchEvent(new Event('change', { bubbles: true }))

    const query = root.querySelector('#query') as HTMLInputElement | null
    expect(query).not.toBeNull()
    query!.value = '智能体'
    query!.dispatchEvent(new Event('input', { bubbles: true }))

    expect(root.textContent).toContain('anthropic/claude-code')
    expect(root.textContent).not.toContain('microsoft/playwright')
    expect(root.textContent).toContain('Coding agent')
  })

  it('keeps search input focused while typing across rerenders', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    renderApp(root, payload)

    const query = root.querySelector('#query') as HTMLInputElement | null
    expect(query).not.toBeNull()

    query!.focus()
    query!.value = 'c'
    query!.dispatchEvent(new Event('input', { bubbles: true }))

    const queryAfterFirstInput = root.querySelector('#query') as HTMLInputElement | null

    expect(document.activeElement).toBe(queryAfterFirstInput)

    queryAfterFirstInput!.value = 'cl'
    queryAfterFirstInput!.dispatchEvent(new Event('input', { bubbles: true }))

    expect(document.activeElement).toBe(root.querySelector('#query'))
    expect(root.textContent).toContain('anthropic/claude-code')
    expect(root.textContent).not.toContain('microsoft/playwright')

    root.remove()
  })
})
