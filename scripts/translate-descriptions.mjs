import { readFile, writeFile } from 'node:fs/promises'

const translationProviders = {
  mock: {
    requiresApiKey: true,
    async translateBatch(repos) {
      return Object.fromEntries(repos.map((repo) => [repo.full_name, repo.description ?? '']))
    }
  }
}

export function getTranslationProvider(providerName) {
  if (!providerName) return null

  return translationProviders[providerName] ?? null
}

export async function readTranslationCache(path, read, log) {
  try {
    return {
      cache: JSON.parse(await read(path, 'utf8')),
      recovered: false
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      log(`Translation cache missing at ${path}, rebuilding from empty cache`)
      return { cache: {}, recovered: true }
    }

    if (error instanceof SyntaxError) {
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

      return cached.source !== source
    })
}

export function mergeTranslations(raw, cache, translatedEntries) {
  const next = { ...cache }

  for (const repo of raw.map((item) => item.repo)) {
    const key = repo.full_name
    const source = repo.description ?? ''
    const translated = translatedEntries[key]

    if (!source.trim()) continue
    if (translated) {
      next[key] = { source, translated }
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

  const apiKey = env.TRANSLATION_API_KEY

  if (provider.requiresApiKey && !apiKey) {
    if (recovered) {
      await persistTranslationCache(paths.cache, cache, write)
    }

    log(`Translation provider "${providerName}" is configured without TRANSLATION_API_KEY, skipping description translation`)
    return { skipped: true, pending: 0 }
  }

  log(`Using translation provider "${providerName}"`)

  const raw = JSON.parse(await read(paths.raw, 'utf8'))
  const pending = collectReposNeedingTranslation(raw, cache)
  const translatedEntries = await provider.translateBatch(pending, {
    apiKey,
    env
  })

  const next = mergeTranslations(raw, cache, translatedEntries)
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
