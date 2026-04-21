import { describe, expect, it } from 'vitest'

import { buildStarsPayload, runBuildPipeline } from '../scripts/build-stars-data.mjs'
import {
  buildOpenAIRequestBody,
  collectReposNeedingTranslation,
  mergeTranslations,
  parseOpenAITranslations,
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

  it('retries repos whose cached translation is empty for the same source', () => {
    const pending = collectReposNeedingTranslation(
      [
        {
          repo: {
            full_name: 'retry/repo',
            description: 'Needs retry'
          }
        }
      ],
      {
        'retry/repo': {
          source: 'Needs retry',
          translated: ''
        }
      }
    )

    expect(pending.map((repo) => repo.full_name)).toEqual(['retry/repo'])
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

  it('recovers from malformed translation cache shape by rebuilding from empty cache', async () => {
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

        return JSON.stringify([{ invalid: true }])
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

  it('builds openai request body with strict json schema and default model', () => {
    const body = buildOpenAIRequestBody([
      {
        full_name: 'openai/openai-node',
        description: 'The official TypeScript library for the OpenAI API'
      }
    ])

    expect(body).toMatchObject({
      model: 'gpt-5.4-mini',
      text: {
        format: {
          type: 'json_schema',
          strict: true
        }
      }
    })
    expect(body.text.format.schema).toMatchObject({
      type: 'object',
      required: ['translations'],
      additionalProperties: false,
      properties: {
        translations: {
          type: 'array'
        }
      }
    })
    expect(JSON.stringify(body)).toContain('fullName')
    expect(JSON.stringify(body)).toContain('descriptionZh')
    expect(JSON.stringify(body)).toContain('openai/openai-node')
  })

  it('parses openai response json into translation entries', () => {
    const translated = parseOpenAITranslations({
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                translations: [
                  {
                    fullName: 'openai/openai-node',
                    descriptionZh: 'OpenAI API 的官方 TypeScript 库'
                  },
                  {
                    fullName: 'vercel/ai',
                    descriptionZh: '用于构建 AI 应用的 SDK'
                  }
                ]
              })
            }
          ]
        }
      ]
    })

    expect(translated).toEqual({
      'openai/openai-node': 'OpenAI API 的官方 TypeScript 库',
      'vercel/ai': '用于构建 AI 应用的 SDK'
    })
  })

  it('rejects openai responses that omit requested repositories', () => {
    expect(() =>
      parseOpenAITranslations(
        {
          output_text: JSON.stringify({
            translations: [
              {
                fullName: 'openai/openai-node',
                descriptionZh: 'OpenAI API 的官方 TypeScript 库'
              }
            ]
          })
        },
        ['openai/openai-node', 'vercel/ai']
      )
    ).toThrow(/missing repositories: vercel\/ai/i)
  })

  it('rejects openai responses with duplicate fullName values', () => {
    expect(() =>
      parseOpenAITranslations({
        output_text: JSON.stringify({
          translations: [
            {
              fullName: 'openai/openai-node',
              descriptionZh: '译文一'
            },
            {
              fullName: 'openai/openai-node',
              descriptionZh: '译文二'
            }
          ]
        })
      })
    ).toThrow(/duplicate fullName/i)
  })

  it('rejects openai responses with extra repositories', () => {
    expect(() =>
      parseOpenAITranslations(
        {
          output_text: JSON.stringify({
            translations: [
              {
                fullName: 'openai/openai-node',
                descriptionZh: 'OpenAI API 的官方 TypeScript 库'
              },
              {
                fullName: 'extra/repo',
                descriptionZh: '额外仓库'
              }
            ]
          })
        },
        ['openai/openai-node']
      )
    ).toThrow(/unexpected repository: extra\/repo/i)
  })

  it('rejects openai responses with malformed translation entries', () => {
    expect(() =>
      parseOpenAITranslations({
        output_text: JSON.stringify({
          translations: [
            {
              fullName: 'openai/openai-node'
            }
          ]
        })
      })
    ).toThrow(/invalid descriptionZh/i)

    expect(() =>
      parseOpenAITranslations({
        output_text: JSON.stringify({
          translations: [
            {
              fullName: '   ',
              descriptionZh: '无效'
            }
          ]
        })
      })
    ).toThrow(/invalid fullName/i)
  })

  it('rejects openai responses without a translations array', () => {
    expect(() => parseOpenAITranslations({ output_text: JSON.stringify({}) })).toThrow(/translations array/i)
  })

  it('rejects openai responses without nested text output', () => {
    expect(() => parseOpenAITranslations({ output: [{ type: 'message', content: [] }] })).toThrow(/missing text output/i)
  })

  it('updates translation cache with openai provider using injected fetch implementation', async () => {
    const reads = {
      'data/stars.raw.json': JSON.stringify([
        {
          repo: {
            full_name: 'openai/openai-node',
            description: 'The official TypeScript library for the OpenAI API'
          }
        }
      ]),
      'data/translations.json': JSON.stringify({})
    }
    const writes: Array<{ path: string; content: string }> = []
    const logs: string[] = []
    const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = []

    const result = await runTranslationPipeline({
      env: {
        TRANSLATION_PROVIDER: 'openai',
        OPENAI_API_KEY: 'openai-test-key',
        OPENAI_RESPONSES_URL: 'https://proxy.lzaske.xyz/v1/responses'
      },
      log: (message) => logs.push(message),
      read: async (path) => reads[path as keyof typeof reads],
      write: async (path, content) => {
        writes.push({ path, content })
      },
      fetchImpl: async (url, init) => {
        fetchCalls.push({ url: String(url), init })

        return new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      translations: [
                        {
                          fullName: 'openai/openai-node',
                          descriptionZh: 'OpenAI API 的官方 TypeScript 库'
                        }
                      ]
                    })
                  }
                ]
              }
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      }
    })

    expect(result).toEqual({ skipped: false, pending: 1 })
    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0]?.url).toBe('https://proxy.lzaske.xyz/v1/responses')
    expect(fetchCalls[0]?.init).toMatchObject({
      method: 'POST',
      headers: {
        authorization: 'Bearer openai-test-key'
      }
    })
    expect(JSON.parse(String(fetchCalls[0]?.init?.body))).toMatchObject({
      model: 'gpt-5.4-mini'
    })
    expect(writes).toHaveLength(1)
    expect(writes[0]?.path).toBe('data/translations.json')
    expect(JSON.parse(writes[0]!.content)['openai/openai-node']).toMatchObject({
      source: 'The official TypeScript library for the OpenAI API',
      translated: 'OpenAI API 的官方 TypeScript 库',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      updatedAt: expect.any(String)
    })
    expect(logs).toContain('Using translation provider "openai"')
    expect(logs).toContain('Updated translations for 1 repositories using provider "openai"')
  })

  it('persists configured openai model metadata in the translation cache', async () => {
    const reads = {
      'data/stars.raw.json': JSON.stringify([
        {
          repo: {
            full_name: 'openai/openai-node',
            description: 'The official TypeScript library for the OpenAI API'
          }
        }
      ]),
      'data/translations.json': JSON.stringify({})
    }
    const writes: Array<{ path: string; content: string }> = []

    const result = await runTranslationPipeline({
      env: {
        TRANSLATION_PROVIDER: 'openai',
        OPENAI_API_KEY: 'openai-test-key',
        OPENAI_TRANSLATION_MODEL: 'gpt-5.4'
      },
      log: () => {},
      read: async (path) => reads[path as keyof typeof reads],
      write: async (path, content) => {
        writes.push({ path, content })
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      translations: [
                        {
                          fullName: 'openai/openai-node',
                          descriptionZh: 'OpenAI API 的官方 TypeScript 库'
                        }
                      ]
                    })
                  }
                ]
              }
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
    })

    expect(result).toEqual({ skipped: false, pending: 1 })
    expect(JSON.parse(writes[0]!.content)).toEqual({
      'openai/openai-node': {
        source: 'The official TypeScript library for the OpenAI API',
        translated: 'OpenAI API 的官方 TypeScript 库',
        provider: 'openai',
        model: 'gpt-5.4',
        updatedAt: expect.any(String)
      }
    })
  })

  it('retries empty cached translations on the next pipeline run', async () => {
    const reads = {
      'data/stars.raw.json': JSON.stringify([
        {
          repo: {
            full_name: 'retry/repo',
            description: 'Needs translation'
          }
        }
      ]),
      'data/translations.json': JSON.stringify({
        'retry/repo': {
          source: 'Needs translation',
          translated: ''
        }
      })
    }
    const writes: Array<{ path: string; content: string }> = []

    const result = await runTranslationPipeline({
      env: { TRANSLATION_PROVIDER: 'mock', TRANSLATION_API_KEY: 'test-key' },
      read: async (path) => reads[path as keyof typeof reads],
      write: async (path, content) => {
        writes.push({ path, content })
      },
      log: () => {}
    })

    expect(result).toEqual({ skipped: false, pending: 1 })
    expect(writes).toEqual([
      {
        path: 'data/translations.json',
        content: `${JSON.stringify(
          {
            'retry/repo': {
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

  it('keeps the old cache and skips safely when openai responses omit requested repositories', async () => {
    const logs: string[] = []
    const writes: Array<{ path: string; content: string }> = []

    const result = await runTranslationPipeline({
      env: {
        TRANSLATION_PROVIDER: 'openai',
        OPENAI_API_KEY: 'openai-test-key'
      },
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/stars.raw.json') {
          return JSON.stringify([
            {
              repo: {
                full_name: 'openai/openai-node',
                description: 'The official TypeScript library for the OpenAI API'
              }
            },
            {
              repo: {
                full_name: 'vercel/ai',
                description: 'AI SDK'
              }
            }
          ])
        }

        return JSON.stringify({
          'cached/repo': {
            source: 'Existing description',
            translated: '现有描述'
          }
        })
      },
      write: async (path, content) => {
        writes.push({ path, content })
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      translations: [
                        {
                          fullName: 'openai/openai-node',
                          descriptionZh: 'OpenAI API 的官方 TypeScript 库'
                        }
                      ]
                    })
                  }
                ]
              }
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
    })

    expect(result).toEqual({ skipped: true, pending: 2 })
    expect(writes).toEqual([])
    expect(logs.some((message) => /OpenAI translation failed/i.test(message))).toBe(true)
  })

  it('keeps the old cache and skips safely when openai requests fail', async () => {
    const logs: string[] = []
    const writes: Array<{ path: string; content: string }> = []

    const result = await runTranslationPipeline({
      env: {
        TRANSLATION_PROVIDER: 'openai',
        OPENAI_API_KEY: 'openai-test-key'
      },
      log: (message) => logs.push(message),
      read: async (path) => {
        if (path === 'data/stars.raw.json') {
          return JSON.stringify([
            {
              repo: {
                full_name: 'openai/openai-node',
                description: 'The official TypeScript library for the OpenAI API'
              }
            }
          ])
        }

        return JSON.stringify({
          'cached/repo': {
            source: 'Existing description',
            translated: '现有描述'
          }
        })
      },
      write: async (path, content) => {
        writes.push({ path, content })
      },
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { message: 'provider overloaded' } }), {
          status: 503,
          headers: { 'content-type': 'application/json' }
        })
    })

    expect(result).toEqual({ skipped: true, pending: 1 })
    expect(writes).toEqual([])
    expect(logs.some((message) => /503.*provider overloaded/i.test(message))).toBe(true)
  })

  it('batches openai translation requests for large pending sets', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const fetchBodies: Array<{ translations: Array<{ fullName: string; description: string }> }> = []
    const rawRepos = Array.from({ length: 5 }, (_, index) => ({
      repo: {
        full_name: `owner/repo-${index + 1}`,
        description: `Description ${index + 1}`
      }
    }))

    const result = await runTranslationPipeline({
      env: {
        TRANSLATION_PROVIDER: 'openai',
        OPENAI_API_KEY: 'openai-test-key',
        OPENAI_TRANSLATION_BATCH_SIZE: '2'
      },
      log: () => {},
      read: async (path) => (path === 'data/stars.raw.json' ? JSON.stringify(rawRepos) : JSON.stringify({})),
      write: async (path, content) => {
        writes.push({ path, content })
      },
      fetchImpl: async (_url, init) => {
        const requestBody = JSON.parse(String(init?.body))
        const inputJson = JSON.parse(requestBody.input[1].content[0].text)
        fetchBodies.push(inputJson)

        return new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      translations: inputJson.translations.map((repo: { fullName: string; description: string }) => ({
                        fullName: repo.fullName,
                        descriptionZh: `${repo.description} zh`
                      }))
                    })
                  }
                ]
              }
            ]
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }
    })

    expect(result).toEqual({ skipped: false, pending: 5 })
    expect(fetchBodies.map((body) => body.translations.map((repo) => repo.fullName))).toEqual([
      ['owner/repo-1', 'owner/repo-2'],
      ['owner/repo-3', 'owner/repo-4'],
      ['owner/repo-5']
    ])
    expect(Object.keys(JSON.parse(writes[0]!.content))).toHaveLength(5)
  })

  it('retries retryable openai failures with bounded attempts', async () => {
    let attempts = 0

    const result = await runTranslationPipeline({
      env: {
        TRANSLATION_PROVIDER: 'openai',
        OPENAI_API_KEY: '  openai-test-key  ',
        OPENAI_TRANSLATION_MAX_RETRIES: '2',
        OPENAI_TRANSLATION_RETRY_BASE_DELAY_MS: '1'
      },
      log: () => {},
      read: async (path) =>
        path === 'data/stars.raw.json'
          ? JSON.stringify([
              {
                repo: {
                  full_name: 'openai/openai-node',
                  description: 'The official TypeScript library for the OpenAI API'
                }
              }
            ])
          : JSON.stringify({}),
      write: async () => {},
      fetchImpl: async (_url, init) => {
        attempts += 1

        if (attempts < 3) {
          return new Response(JSON.stringify({ error: { message: 'provider overloaded' } }), {
            status: 503,
            headers: { 'content-type': 'application/json' }
          })
        }

        expect(init?.headers).toMatchObject({ authorization: 'Bearer openai-test-key' })

        return new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      translations: [
                        {
                          fullName: 'openai/openai-node',
                          descriptionZh: 'OpenAI API 的官方 TypeScript 库'
                        }
                      ]
                    })
                  }
                ]
              }
            ]
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }
    })

    expect(result).toEqual({ skipped: false, pending: 1 })
    expect(attempts).toBe(3)
  })

  it('fails with a clear error when raw stars data is not an array of repo entries', async () => {
    await expect(
      runTranslationPipeline({
        env: { TRANSLATION_PROVIDER: 'mock', TRANSLATION_API_KEY: 'test-key' },
        log: () => {},
        read: async (path) => {
          if (path === 'data/stars.raw.json') {
            return JSON.stringify({ repo: { full_name: 'bad/repo' } })
          }

          return JSON.stringify({})
        },
        write: async () => {
          throw new Error('should not write invalid raw data results')
        }
      })
    ).rejects.toThrow(/raw stars data must be an array of items with repo objects/i)
  })

  it('fails with a clear error when raw stars data entries are missing repo objects', async () => {
    await expect(
      runTranslationPipeline({
        env: { TRANSLATION_PROVIDER: 'mock', TRANSLATION_API_KEY: 'test-key' },
        log: () => {},
        read: async (path) => {
          if (path === 'data/stars.raw.json') {
            return JSON.stringify([{ notRepo: true }])
          }

          return JSON.stringify({})
        },
        write: async () => {
          throw new Error('should not write invalid raw data results')
        }
      })
    ).rejects.toThrow(/raw stars data contains an invalid entry at index 0/i)
  })

  it('fails with a clear error when raw stars data repo.full_name is invalid', async () => {
    await expect(
      runTranslationPipeline({
        env: { TRANSLATION_PROVIDER: 'mock', TRANSLATION_API_KEY: 'test-key' },
        log: () => {},
        read: async (path) => {
          if (path === 'data/stars.raw.json') {
            return JSON.stringify([{ repo: { full_name: '   ', description: 'bad' } }])
          }

          return JSON.stringify({})
        },
        write: async () => {
          throw new Error('should not write invalid raw data results')
        }
      })
    ).rejects.toThrow(/invalid repo\.full_name at index 0/i)
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
