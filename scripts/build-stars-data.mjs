import { readFile, writeFile } from 'node:fs/promises'

import { classifyRepo } from './classify-stars.mjs'

const categories = new Set([
  'AI / LLM',
  'Frontend',
  'Backend',
  'Fullstack',
  'DevTools',
  'CLI',
  'Data / Database',
  'Automation',
  'Infra / Ops',
  'Learning / Docs',
  'Design',
  'Misc'
])

export function buildStarsPayload(raw, overrides = {}) {
  const repos = raw.map((item) => {
    const repo = item.repo
    const fullName = repo.full_name
    const override = overrides[fullName] ?? {}
    const autoCategory = classifyRepo(repo)
    const category = categories.has(override.category) ? override.category : autoCategory

    return {
      fullName,
      name: repo.name,
      owner: repo.owner.login,
      url: repo.html_url,
      description: repo.description ?? '',
      homepage: repo.homepage ?? '',
      language: repo.language ?? 'Unknown',
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

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
  const raw = JSON.parse(await readFile('data/stars.raw.json', 'utf8'))
  const overrides = JSON.parse(await readFile('data/overrides.json', 'utf8'))
  const payload = buildStarsPayload(raw, overrides)

  await writeFile('data/stars.json', `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Built stars.json with ${payload.total} visible repositories`)
}
