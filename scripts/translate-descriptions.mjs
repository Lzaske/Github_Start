import { readFile, writeFile } from 'node:fs/promises'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_OPENAI_TRANSLATION_MODEL = 'gpt-5.4-mini'
const DEFAULT_OPENAI_BATCH_SIZE = 50
const DEFAULT_OPENAI_TIMEOUT_MS = 30000
const DEFAULT_OPENAI_MAX_RETRIES = 2
const DEFAULT_OPENAI_RETRY_BASE_DELAY_MS = 500

function getOpenAIResponsesUrl(env) {
  return env.OPENAI_RESPONSES_URL?.trim() || OPENAI_RESPONSES_URL
}

function buildOpenAIMetadata(model) {
  return {
    provider: 'openai',
    model,
    updatedAt: new Date().toISOString()
  }
}

export function buildOpenAIRequestBody(repos, model = DEFAULT_OPENAI_TRANSLATION_MODEL) {
  return {
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'Translate GitHub repository descriptions into Simplified Chinese. Return strict JSON only. Preserve repository fullName exactly. If a description is empty, return an empty descriptionZh.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify({
              translations: repos.map((repo) => ({
                fullName: repo.full_name,
                description: repo.description ?? ''
              }))
            })
          }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        strict: true,
        name: 'github_repo_translations',
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['translations'],
          properties: {
            translations: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['fullName', 'descriptionZh'],
                properties: {
                  fullName: { type: 'string' },
                  descriptionZh: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
}

export function parseOpenAITranslations(payload, expectedFullNames = null) {
  const rawText = extractOpenAIOutputText(payload)

  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('OpenAI translation payload is missing text output')
  }

  const parsed = JSON.parse(rawText)
  const translations = parsed?.translations

  if (!Array.isArray(translations)) {
    throw new Error('OpenAI translation payload must include a translations array')
  }

  const expected = expectedFullNames ? new Set(expectedFullNames) : null
  const seen = new Set()
  const parsedTranslations = {}

  for (const [index, entry] of translations.entries()) {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`OpenAI translation payload contains a malformed translation at index ${index}`)
    }

    if (typeof entry.fullName !== 'string' || !entry.fullName.trim()) {
      throw new Error(`OpenAI translation payload contains an invalid fullName at index ${index}`)
    }

    if (typeof entry.descriptionZh !== 'string') {
      throw new Error(`OpenAI translation payload contains an invalid descriptionZh at index ${index}`)
    }

    if (seen.has(entry.fullName)) {
      throw new Error(`OpenAI translation payload contains a duplicate fullName: ${entry.fullName}`)
    }

    if (expected && !expected.has(entry.fullName)) {
      throw new Error(`OpenAI translation payload contains an unexpected repository: ${entry.fullName}`)
    }

    seen.add(entry.fullName)
    parsedTranslations[entry.fullName] = entry.descriptionZh
  }

  if (expected) {
    const missing = expectedFullNames.filter((fullName) => !seen.has(fullName))

    if (missing.length > 0) {
      throw new Error(`OpenAI translation payload is missing repositories: ${missing.join(', ')}`)
    }
  }

  return parsedTranslations
}

function extractOpenAIOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  if (!Array.isArray(payload?.output)) {
    return null
  }

  const textParts = []

  for (const outputItem of payload.output) {
    if (!outputItem || typeof outputItem !== 'object' || !Array.isArray(outputItem.content)) {
      continue
    }

    for (const contentItem of outputItem.content) {
      if (!contentItem || typeof contentItem !== 'object') {
        continue
      }

      const text =
        typeof contentItem.text === 'string'
          ? contentItem.text
          : typeof contentItem.output_text === 'string'
            ? contentItem.output_text
            : null

      if (text && text.trim()) {
        textParts.push(text)
      }
    }
  }

  return textParts.length > 0 ? textParts.join('\n') : null
}

function chunkRepos(repos, batchSize) {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error('OpenAI translation batch size must be a positive integer')
  }

  const chunks = []

  for (let index = 0; index < repos.length; index += batchSize) {
    chunks.push(repos.slice(index, index + batchSize))
  }

  return chunks
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableOpenAIError(error) {
  return Boolean(error?.retryable)
}

async function fetchOpenAITranslations(repos, { apiKey, env, fetchImpl = fetch }) {
  const timeoutMs = parsePositiveInteger(env.OPENAI_TRANSLATION_TIMEOUT_MS, DEFAULT_OPENAI_TIMEOUT_MS)
  const maxRetries = parseNonNegativeInteger(env.OPENAI_TRANSLATION_MAX_RETRIES, DEFAULT_OPENAI_MAX_RETRIES)
  const retryBaseDelayMs = parsePositiveInteger(env.OPENAI_TRANSLATION_RETRY_BASE_DELAY_MS, DEFAULT_OPENAI_RETRY_BASE_DELAY_MS)
  const model = env.OPENAI_TRANSLATION_MODEL?.trim() || DEFAULT_OPENAI_TRANSLATION_MODEL
  const responsesUrl = getOpenAIResponsesUrl(env)

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)

    try {
      const response = await fetchImpl(responsesUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(buildOpenAIRequestBody(repos, model)),
        signal: controller.signal
      })

      if (!response.ok) {
        const responseBody = await response.text()
        const bodySuffix = responseBody.trim() ? ` - ${responseBody}` : ''
        const error = new Error(`OpenAI translation request failed: ${response.status}${bodySuffix}`)
        error.retryable = response.status === 408 || response.status === 429 || response.status >= 500
        throw error
      }

      return parseOpenAITranslations(await response.json(), repos.map((repo) => repo.full_name))
    } catch (error) {
      const aborted = controller.signal.aborted
      const timeoutError = aborted && controller.signal.reason instanceof Error ? controller.signal.reason : null
      const isAbortError = error?.name === 'AbortError' || aborted
      const nextError =
        isAbortError && timeoutError
          ? Object.assign(new Error(`OpenAI translation request failed: ${timeoutError.message}`), { retryable: true })
          : error

      if (isRetryableOpenAIError(nextError) && attempt < maxRetries) {
        await delay(retryBaseDelayMs * 2 ** attempt)
        continue
      }

      throw nextError
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new Error('OpenAI translation request failed after retries')
}

const translationProviders = {
  mock: {
    requiresApiKey: true,
    getApiKey(env) {
      return env.TRANSLATION_API_KEY
    },
    async translateBatch(repos) {
      return Object.fromEntries(repos.map((repo) => [repo.full_name, repo.description ?? '']))
    }
  },
  openai: {
    requiresApiKey: true,
    getApiKey(env) {
      return env.OPENAI_API_KEY?.trim()
    },
    async translateBatch(repos, { apiKey, env, fetchImpl = fetch }) {
      if (repos.length === 0) {
        return {}
      }

      const batchSize = parsePositiveInteger(env.OPENAI_TRANSLATION_BATCH_SIZE, DEFAULT_OPENAI_BATCH_SIZE)
      const translatedEntries = {}

      for (const batch of chunkRepos(repos, batchSize)) {
        Object.assign(translatedEntries, await fetchOpenAITranslations(batch, { apiKey, env, fetchImpl }))
      }

      return translatedEntries
    }
  }
}

export function getTranslationProvider(providerName) {
  if (!providerName) return null

  return translationProviders[providerName] ?? null
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isValidTranslationCache(cache) {
  if (!isPlainObject(cache)) {
    return false
  }

  return Object.values(cache).every(
    (entry) =>
      isPlainObject(entry) &&
      typeof entry.source === 'string' &&
      typeof entry.translated === 'string' &&
      (entry.provider === undefined || typeof entry.provider === 'string') &&
      (entry.model === undefined || typeof entry.model === 'string') &&
      (entry.updatedAt === undefined || typeof entry.updatedAt === 'string')
  )
}

function validateRawStarsData(raw) {
  if (!Array.isArray(raw)) {
    throw new Error('Raw stars data must be an array of items with repo objects')
  }

  for (const [index, item] of raw.entries()) {
    if (!isPlainObject(item) || !isPlainObject(item.repo)) {
      throw new Error(`Raw stars data contains an invalid entry at index ${index}: each item must include a repo object`)
    }

    if (typeof item.repo.full_name !== 'string' || !item.repo.full_name.trim()) {
      throw new Error(`Raw stars data contains an invalid repo.full_name at index ${index}`)
    }
  }

  return raw
}

export async function readTranslationCache(path, read, log) {
  try {
    const cache = JSON.parse(await read(path, 'utf8'))

    if (!isValidTranslationCache(cache)) {
      throw new Error('INVALID_TRANSLATION_CACHE_SHAPE')
    }

    return {
      cache,
      recovered: false
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      log(`Translation cache missing at ${path}, rebuilding from empty cache`)
      return { cache: {}, recovered: true }
    }

    if (error instanceof SyntaxError || error?.message === 'INVALID_TRANSLATION_CACHE_SHAPE') {
      log(`Translation cache at ${path} is malformed, rebuilding from empty cache`)
      return { cache: {}, recovered: true }
    }

    throw error
  }
} 

export async function persistTranslationCache(path, cache, write) {
  await write(path, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
}

export function collectReposNeedingTranslation(raw, cache) {
  return raw
    .map((item) => item.repo)
    .filter((repo) => {
      const key = repo.full_name
      const source = repo.description ?? ''
      const cached = cache[key]

      if (!source.trim()) return false
      if (!cached) return true
      if (typeof cached.translated !== 'string' || !cached.translated.trim()) return true

      return cached.source !== source
    })
}

export function mergeTranslations(raw, cache, translatedEntries, metadataEntries = {}) {
  const next = { ...cache }

  for (const repo of raw.map((item) => item.repo)) {
    const key = repo.full_name
    const source = repo.description ?? ''
    const translated = translatedEntries[key]

    if (!source.trim()) continue
    if (Object.hasOwn(translatedEntries, key)) {
      if (typeof translated !== 'string') {
        throw new Error(`Translation provider returned an invalid translation for ${key}`)
      }

      const metadata = metadataEntries[key]
      next[key] = metadata ? { source, translated, ...metadata } : { source, translated }
      continue
    }

    if (!next[key] || next[key].source !== source) {
      next[key] = { source, translated: '' }
    }
  }

  return next
}

export async function runTranslationPipeline({
  read = readFile,
  write = writeFile,
  fetchImpl = fetch,
  env = process.env,
  log = console.log,
  paths = {
    raw: 'data/stars.raw.json',
    cache: 'data/translations.json'
  }
} = {}) {
  const providerName = env.TRANSLATION_PROVIDER?.trim()
  const { cache, recovered } = await readTranslationCache(paths.cache, read, log)

  if (!providerName) {
    if (recovered) {
      await persistTranslationCache(paths.cache, cache, write)
    }

    log('No translation provider configured, skipping description translation')
    return { skipped: true, pending: 0 }
  }

  const provider = getTranslationProvider(providerName)

  if (!provider) {
    if (recovered) {
      await persistTranslationCache(paths.cache, cache, write)
    }

    log(`Translation provider "${providerName}" is not supported yet, skipping description translation`)
    return { skipped: true, pending: 0 }
  }

  const apiKey = provider.getApiKey?.(env)
  const apiKeyName = providerName === 'openai' ? 'OPENAI_API_KEY' : 'TRANSLATION_API_KEY'

  if (provider.requiresApiKey && !apiKey) {
    if (recovered) {
      await persistTranslationCache(paths.cache, cache, write)
    }

    log(`Translation provider "${providerName}" is configured without ${apiKeyName}, skipping description translation`)
    return { skipped: true, pending: 0 }
  }

  log(`Using translation provider "${providerName}"`)

  const raw = validateRawStarsData(JSON.parse(await read(paths.raw, 'utf8')))
  const pending = collectReposNeedingTranslation(raw, cache)
  const openAIModel = env.OPENAI_TRANSLATION_MODEL?.trim() || DEFAULT_OPENAI_TRANSLATION_MODEL

  let translatedEntries

  try {
    translatedEntries = await provider.translateBatch(pending, {
      apiKey,
      env,
      fetchImpl
    })
  } catch (error) {
    if (providerName === 'openai') {
      log(`OpenAI translation failed, preserving existing cache and skipping update: ${error.message}`)
      return { skipped: true, pending: pending.length }
    }

    throw error
  }

  const metadataEntries =
    providerName === 'openai'
      ? Object.fromEntries(pending.map((repo) => [repo.full_name, buildOpenAIMetadata(openAIModel)]))
      : {}

  const next = mergeTranslations(raw, cache, translatedEntries, metadataEntries)
  await persistTranslationCache(paths.cache, next, write)
  log(`Updated translations for ${pending.length} repositories using provider "${providerName}"`)

  return { skipped: false, pending: pending.length }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
  runTranslationPipeline().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
