import { mkdir, writeFile } from 'node:fs/promises'

const owner = process.env.GITHUB_STARS_OWNER
const token = process.env.GH_PAT || process.env.GITHUB_TOKEN

if (!owner) {
  throw new Error('Missing GITHUB_STARS_OWNER')
}

if (!token) {
  throw new Error('Missing GH_PAT or GITHUB_TOKEN')
}

async function fetchAllStars() {
  const results = []
  let page = 1

  while (true) {
    const response = await fetch(`https://api.github.com/users/${owner}/starred?per_page=100&page=${page}`, {
      headers: {
        Accept: 'application/vnd.github.star+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'github-stars-hub'
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`)
    }

    const pageData = await response.json()
    results.push(...pageData)

    if (pageData.length < 100) break
    page += 1
  }

  return results
}

const stars = await fetchAllStars()

await mkdir('data', { recursive: true })
await writeFile('data/stars.raw.json', `${JSON.stringify(stars, null, 2)}\n`, 'utf8')

console.log(`Fetched ${stars.length} starred repositories for ${owner}`)
