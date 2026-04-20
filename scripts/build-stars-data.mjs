import { readFile, writeFile } from 'node:fs/promises'

import { classifyRepo } from './classify-stars.mjs'
import categories from '../src/categories.json' with { type: 'json' }

const categorySet = new Set(categories)

export function buildStarsPayload(raw, overrides = {}, translations = {}) {
  const repos = raw.map((item) => {
    const repo = item.repo
    const fullName = repo.full_name
    const override = overrides[fullName] ?? {}
    const translation = translations[fullName]
    const autoCategory = classifyRepo(repo)
    const category = categorySet.has(override.category) ? override.category : autoCategory
    const sourceDescription = repo.description ?? ''
    const cachedDescriptionZh = translation?.source === sourceDescription ? translation.translated : ''
    const translationStatus = cachedDescriptionZh ? 'translated' : sourceDescription.trim() ? 'fallback' : 'skipped'

    return {
      fullName,
      name: repo.name,
      owner: repo.owner.login,
      url: repo.html_url,
      description: sourceDescription,
      descriptionZh: cachedDescriptionZh,
      translationStatus,
      homepage: repo.homepage ?? '',
      language: repo.language ?? '未知',
      stars: repo.stargazers_count ?? 0,
      topics: repo.topics ?? [],
      updatedAt: repo.updated_at,
      createdAt: repo.created_at,
      starredAt: item.starred_at ?? repo.updated_at,
      autoCategory,
      category,
      hidden: override.hidden ?? false,
      pinned: override.pinned ?? false,
      note: override.note ?? '',
      weight: override.weight ?? 0
    }
  })

  const visible = repos.filter((repo) => !repo.hidden)

  return {
    generatedAt: new Date().toISOString(),
    total: visible.length,
    categories: Array.from(new Set(visible.map((repo) => repo.category))),
    repos
  }
}

export async function readTranslations(path, read, log) {
  try {
    return JSON.parse(await read(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') {
      log(`Translation cache missing at ${path}, continuing with empty translations`)
      return {}
    }

    if (error instanceof SyntaxError) {
      log(`Translation cache at ${path} is malformed, continuing with empty translations`)
      return {}
    }

    throw error
  }
}

export async function runBuildPipeline({
  read = readFile,
  write = writeFile,
  log = console.log,
  paths = {
    raw: 'data/stars.raw.json',
    overrides: 'data/overrides.json',
    translations: 'data/translations.json',
    output: 'data/stars.json'
  }
} = {}) {
  const raw = JSON.parse(await read(paths.raw, 'utf8'))
  const overrides = JSON.parse(await read(paths.overrides, 'utf8'))
  const translations = await readTranslations(paths.translations, read, log)
  const payload = buildStarsPayload(raw, overrides, translations)

  await write(paths.output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  log(`Built stars.json with ${payload.total} visible repositories`)

  return payload
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
  await runBuildPipeline()
}
