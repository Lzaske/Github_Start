import { describe, expect, it } from 'vitest'

import { buildStarsPayload, runBuildPipeline } from '../scripts/build-stars-data.mjs'
import {
  collectReposNeedingTranslation,
  mergeTranslations,
  runTranslationPipeline
} from '../scripts/translate-descriptions.mjs'

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

  it('uses cached zh translation when source description is unchanged', () => {
    const payload = buildStarsPayload(
      [
        {
          starred_at: '2026-04-20T00:00:00.000Z',
          repo: {
            full_name: 'vercel/ai',
            name: 'ai',
            owner: { login: 'vercel' },
            html_url: 'https://github.com/vercel/ai',
            description: 'Build AI-powered applications with React, Svelte, Vue, and Solid',
            homepage: '',
            language: 'TypeScript',
            stargazers_count: 1000,
            topics: ['ai'],
            updated_at: '2026-04-20T00:00:00.000Z',
            created_at: '2026-04-01T00:00:00.000Z'
          }
        }
      ],
      {},
      {
        'vercel/ai': {
          source: 'Build AI-powered applications with React, Svelte, Vue, and Solid',
          translated: '用 React、Svelte、Vue 和 Solid 构建 AI 应用'
        }
      }
    )

    expect(payload.repos[0]).toMatchObject({
      descriptionZh: '用 React、Svelte、Vue 和 Solid 构建 AI 应用',
      translationStatus: 'translated'
    })
  })

  it('falls back to original description when translation is missing or stale', () => {
    const payload = buildStarsPayload(
      [
        {
          starred_at: '2026-04-20T00:00:00.000Z',
          repo: {
            full_name: 'openai/openai-node',
            name: 'openai-node',
            owner: { login: 'openai' },
            html_url: 'https://github.com/openai/openai-node',
            description: 'The official TypeScript library for the OpenAI API',
            homepage: '',
            language: 'TypeScript',
            stargazers_count: 500,
            topics: ['ai'],
            updated_at: '2026-04-20T00:00:00.000Z',
            created_at: '2026-04-01T00:00:00.000Z'
          }
        }
      ],
      {},
      {
        'openai/openai-node': {
          source: 'Old description',
          translated: '旧描述'
        }
      }
    )

    expect(payload.repos[0]).toMatchObject({
      descriptionZh: '',
      translationStatus: 'fallback'
    })
  })

  it('marks repos without descriptions as skipped', () => {
    const payload = buildStarsPayload([
      {
        starred_at: '2026-04-20T00:00:00.000Z',
        repo: {
          full_name: 'owner/empty',
          name: 'empty',
          owner: { login: 'owner' },
          html_url: 'https://github.com/owner/empty',
          description: '',
          homepage: '',
          language: 'TypeScript',
          stargazers_count: 1,
          topics: [],
          updated_at: '2026-04-20T00:00:00.000Z',
          created_at: '2026-04-01T00:00:00.000Z'
        }
      }
    ])

    expect(payload.repos[0]).toMatchObject({
      descriptionZh: '',
      translationStatus: 'skipped'
    })
  })
})

describe('translate-descriptions helpers', () => {
  it('collects only repos with missing or stale cached translations', () => {
    const pending = collectReposNeedingTranslation(
      [
        {
          repo: {
            full_name: 'cached/repo',
            description: 'Fresh description'
          }
        },
        {
          repo: {
            full_name: 'stale/repo',
            description: 'New description'
          }
        },
        {
          repo: {
            full_name: 'new/repo',
            description: 'Needs translation'
          }
        },
        {
          repo: {
            full_name: 'empty/repo',
            description: '   '
          }
        }
      ],
      {
        'cached/repo': {
          source: 'Fresh description',
          translated: '新鲜描述'
        },
        'stale/repo': {
          source: 'Old description',
          translated: '旧描述'
        }
      }
    )

    expect(pending.map((repo) => repo.full_name)).toEqual(['stale/repo', 'new/repo'])
  })

  it('merges translated entries into cache while preserving untouched entries', () => {
    const next = mergeTranslations(
      [
        {
          repo: {
            full_name: 'fresh/repo',
            description: 'Fresh description'
          }
        },
        {
          repo: {
            full_name: 'skip/repo',
            description: ''
          }
        }
      ],
      {
        'existing/repo': {
          source: 'Existing description',
          translated: '现有描述'
        }
      },
      {
        'fresh/repo': '全新描述'
      }
    )

    expect(next).toEqual({
      'existing/repo': {
        source: 'Existing description',
        translated: '现有描述'
      },
      'fresh/repo': {
        source: 'Fresh description',
        translated: '全新描述'
      }
    })
  })

  it('clears stale cached translations when provider returns no translation for updated source', () => {
    const next = mergeTranslations(
      [
        {
          repo: {
            full_name: 'stale/repo',
            description: 'New description'
          }
        }
      ],
      {
        'stale/repo': {
          source: 'Old description',
          translated: '旧描述'
        }
      },
      {}
    )

    expect(next).toEqual({
      'stale/repo': {
        source: 'New description',
        translated: ''
      }
    })
  })

  it('skips translation pipeline without api key', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const logs: string[] = []

    const result = await runTranslationPipeline({
      env: {},
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/stars.raw.json') {
          return JSON.stringify([])
        }

        throw Object.assign(new Error('missing file'), { code: 'ENOENT' })
      },
      write: async (path, content) => {
        writes.push({ path, content })
      }
    })

    expect(result).toEqual({ skipped: true, pending: 0 })
    expect(writes).toEqual([{ path: 'data/translations.json', content: '{}\n' }])
    expect(logs).toContain('Translation cache missing at data/translations.json, rebuilding from empty cache')
    expect(logs).toContain('No translation provider configured, skipping description translation')
  })

  it('skips without reading raw data when no provider is configured', async () => {
    const logs: string[] = []

    const result = await runTranslationPipeline({
      env: {},
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/translations.json') {
          return JSON.stringify({})
        }

        throw new Error(`should not read ${path}`)
      },
      write: async () => {
        throw new Error('should not write')
      }
    })

    expect(result).toEqual({ skipped: true, pending: 0 })
    expect(logs).toContain('No translation provider configured, skipping description translation')
  })

  it('skips translation when provider is configured without required api key', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const logs: string[] = []

    const result = await runTranslationPipeline({
      env: { TRANSLATION_PROVIDER: 'mock' },
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/stars.raw.json') {
          return JSON.stringify([])
        }

        return '{bad json'
      },
      write: async (path, content) => {
        writes.push({ path, content })
      }
    })

    expect(result).toEqual({ skipped: true, pending: 0 })
    expect(writes).toEqual([{ path: 'data/translations.json', content: '{}\n' }])
    expect(logs).toContain('Translation cache at data/translations.json is malformed, rebuilding from empty cache')
    expect(logs).toContain('Translation provider "mock" is configured without TRANSLATION_API_KEY, skipping description translation')
  })

  it('skips without reading raw data when api key is missing', async () => {
    const logs: string[] = []

    const result = await runTranslationPipeline({
      env: { TRANSLATION_PROVIDER: 'mock' },
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/translations.json') {
          return JSON.stringify({})
        }

        throw new Error(`should not read ${path}`)
      },
      write: async () => {
        throw new Error('should not write')
      }
    })

    expect(result).toEqual({ skipped: true, pending: 0 })
    expect(logs).toContain('Translation provider "mock" is configured without TRANSLATION_API_KEY, skipping description translation')
  })

  it('skips safely when provider is unsupported', async () => {
    const reads = {
      'data/stars.raw.json': JSON.stringify([]),
      'data/translations.json': JSON.stringify({})
    }
    const logs: string[] = []

    const result = await runTranslationPipeline({
      env: { TRANSLATION_PROVIDER: 'unknown-provider', TRANSLATION_API_KEY: 'test-key' },
      log: (message) => logs.push(message),
      read: async (path) => reads[path as keyof typeof reads],
      write: async () => {
        throw new Error('should not write')
      }
    })

    expect(result).toEqual({ skipped: true, pending: 0 })
    expect(logs).toContain('Translation provider "unknown-provider" is not supported yet, skipping description translation')
  })

  it('recovers from missing translation cache by rebuilding from empty cache', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const logs: string[] = []

    const result = await runTranslationPipeline({
      env: { TRANSLATION_PROVIDER: 'mock', TRANSLATION_API_KEY: 'test-key' },
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/stars.raw.json') {
          return JSON.stringify([
            {
              repo: {
                full_name: 'new/repo',
                description: 'Needs translation'
              }
            }
          ])
        }

        throw Object.assign(new Error('missing file'), { code: 'ENOENT' })
      },
      write: async (path, content) => {
        writes.push({ path, content })
      }
    })

    expect(result).toEqual({ skipped: false, pending: 1 })
    expect(logs).toContain('Translation cache missing at data/translations.json, rebuilding from empty cache')
    expect(writes).toEqual([
      {
        path: 'data/translations.json',
        content: `${JSON.stringify(
          {
            'new/repo': {
              source: 'Needs translation',
              translated: 'Needs translation'
            }
          },
          null,
          2
        )}\n`
      }
    ])
  })

  it('recovers from malformed translation cache by rebuilding from empty cache', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const logs: string[] = []

    const result = await runTranslationPipeline({
      env: { TRANSLATION_PROVIDER: 'mock', TRANSLATION_API_KEY: 'test-key' },
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/stars.raw.json') {
          return JSON.stringify([
            {
              repo: {
                full_name: 'new/repo',
                description: 'Needs translation'
              }
            }
          ])
        }

        return '{bad json'
      },
      write: async (path, content) => {
        writes.push({ path, content })
      }
    })

    expect(result).toEqual({ skipped: false, pending: 1 })
    expect(logs).toContain('Translation cache at data/translations.json is malformed, rebuilding from empty cache')
    expect(writes).toEqual([
      {
        path: 'data/translations.json',
        content: `${JSON.stringify(
          {
            'new/repo': {
              source: 'Needs translation',
              translated: 'Needs translation'
            }
          },
          null,
          2
        )}\n`
      }
    ])
  })

  it('updates translation cache for pending repositories when supported provider is configured', async () => {
    const reads = {
      'data/stars.raw.json': JSON.stringify([
        {
          repo: {
            full_name: 'new/repo',
            description: 'Needs translation'
          }
        },
        {
          repo: {
            full_name: 'cached/repo',
            description: 'Fresh description'
          }
        }
      ]),
      'data/translations.json': JSON.stringify({
        'cached/repo': {
          source: 'Fresh description',
          translated: '新鲜描述'
        }
      })
    }
    const writes: Array<{ path: string; content: string }> = []
    const logs: string[] = []

    const result = await runTranslationPipeline({
      env: { TRANSLATION_PROVIDER: 'mock', TRANSLATION_API_KEY: 'test-key' },
      log: (message) => logs.push(message),
      read: async (path) => reads[path as keyof typeof reads],
      write: async (path, content) => {
        writes.push({ path, content })
      }
    })

    expect(result).toEqual({ skipped: false, pending: 1 })
    expect(writes).toEqual([
      {
        path: 'data/translations.json',
        content: `${JSON.stringify(
          {
            'cached/repo': {
              source: 'Fresh description',
              translated: '新鲜描述'
            },
            'new/repo': {
              source: 'Needs translation',
              translated: 'Needs translation'
            }
          },
          null,
          2
        )}\n`
      }
    ])
    expect(logs).toContain('Using translation provider "mock"')
    expect(logs).toContain('Updated translations for 1 repositories using provider "mock"')
  })
})

describe('runBuildPipeline', () => {
  it('recovers from missing translation cache', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const logs: string[] = []

    const result = await runBuildPipeline({
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/stars.raw.json') {
          return JSON.stringify([])
        }

        if (path === 'data/overrides.json') {
          return JSON.stringify({})
        }

        throw Object.assign(new Error('missing file'), { code: 'ENOENT' })
      },
      write: async (path, content) => {
        writes.push({ path, content })
      }
    })

    expect(result.total).toBe(0)
    expect(logs).toContain('Translation cache missing at data/translations.json, continuing with empty translations')
    expect(writes).toEqual([
      {
        path: 'data/stars.json',
        content: `${JSON.stringify(result, null, 2)}\n`
      }
    ])
  })

  it('recovers from malformed translation cache', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const logs: string[] = []

    const result = await runBuildPipeline({
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/stars.raw.json') {
          return JSON.stringify([])
        }

        if (path === 'data/overrides.json') {
          return JSON.stringify({})
        }

        return '{bad json'
      },
      write: async (path, content) => {
        writes.push({ path, content })
      }
    })

    expect(result.total).toBe(0)
    expect(logs).toContain('Translation cache at data/translations.json is malformed, continuing with empty translations')
    expect(writes).toEqual([
      {
        path: 'data/stars.json',
        content: `${JSON.stringify(result, null, 2)}\n`
      }
    ])
  })
})
