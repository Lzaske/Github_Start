# GitHub Stars Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个自动同步 GitHub Stars、支持自动分类和手动覆盖、并发布到 GitHub Pages 的静态导航页。

**Architecture:** 使用 Vite + TypeScript 生成纯静态前端页面，GitHub Actions 负责拉取 Stars、分类、合并覆盖配置、构建并部署。数据层采用 `data/stars.raw.json` 和 `data/stars.json`，展示层只消费最终数据，保证数据处理和页面渲染边界清晰。

**Tech Stack:** Vite, TypeScript, GitHub Actions, GitHub Pages, GitHub REST API

---

## File Structure

- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `src/types.ts`
- Create: `src/render.ts`
- Create: `src/filter.ts`
- Create: `src/config.ts`
- Create: `scripts/fetch-stars.mjs`
- Create: `scripts/classify-stars.mjs`
- Create: `scripts/build-stars-data.mjs`
- Create: `data/overrides.json`
- Create: `data/stars.raw.json`
- Create: `data/stars.json`
- Create: `.github/workflows/update-stars.yml`
- Modify: `README.zh-cn.md`

## Task 1: 初始化项目脚手架

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`

- [ ] **Step 1: 写初始化配置文件**

```gitignore
node_modules/
dist/
.vite/
.worktrees/
data/stars.raw.json
```

```json
{
  "name": "github-stars-hub",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "npm run data:build && vite build",
    "preview": "vite preview",
    "data:fetch": "node scripts/fetch-stars.mjs",
    "data:build": "node scripts/build-stars-data.mjs"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src", "vite.config.ts"]
}
```

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: './'
})
```

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GitHub Stars Hub</title>
    <script type="module" src="/src/main.ts"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: 成功生成 `package-lock.json`，无安装错误

- [ ] **Step 3: 运行空项目构建验证基础环境**

Run: `npm run build`
Expected: 失败，报错指出 `src/main.ts` 或数据文件尚不存在

- [ ] **Step 4: 提交初始化脚手架**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html
git commit -m "chore: initialize stars hub scaffold"
```

## Task 2: 定义数据模型与页面入口

**Files:**
- Create: `src/types.ts`
- Create: `src/config.ts`
- Create: `src/main.ts`

- [ ] **Step 1: 写前端数据类型和分类常量**

```ts
export const CATEGORIES = [
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
] as const

export type Category = (typeof CATEGORIES)[number]

export interface RepoTopic {
  name: string
}

export interface StarRepo {
  fullName: string
  name: string
  owner: string
  url: string
  description: string
  homepage: string
  language: string
  stars: number
  topics: string[]
  updatedAt: string
  createdAt: string
  starredAt: string
  category: Category
  autoCategory: Category
  hidden: boolean
  pinned: boolean
  note: string
  weight: number
}

export interface StarsPayload {
  generatedAt: string
  total: number
  categories: Category[]
  repos: StarRepo[]
}
```

```ts
export const SITE_TITLE = 'GitHub Stars Hub'
export const SITE_DESCRIPTION = '自动同步、自动分类、支持手动微调的 GitHub Stars 导航页'
```

```ts
import './style.css'
import type { StarsPayload } from './types'
import { renderApp } from './render'

async function bootstrap() {
  const response = await fetch('./data/stars.json')

  if (!response.ok) {
    throw new Error(`Failed to load stars data: ${response.status}`)
  }

  const payload = (await response.json()) as StarsPayload
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) {
    throw new Error('App container not found')
  }

  renderApp(app, payload)
}

bootstrap().catch((error) => {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (app) {
    app.innerHTML = `<main class="error-state"><h1>加载失败</h1><p>${error instanceof Error ? error.message : '未知错误'}</p></main>`
  }
})
```

- [ ] **Step 2: 运行类型检查式构建验证入口缺少实现**

Run: `npm run build`
Expected: 失败，提示 `./render` 或 `./style.css` 不存在

- [ ] **Step 3: 提交数据模型和入口**

```bash
git add src/types.ts src/config.ts src/main.ts
git commit -m "feat: add stars hub data models and app entry"
```

## Task 3: 实现页面渲染与筛选体验

**Files:**
- Create: `src/render.ts`
- Create: `src/filter.ts`
- Create: `src/style.css`

- [ ] **Step 1: 写筛选与排序逻辑**

```ts
import type { Category, StarRepo } from './types'

export type SortKey = 'starred' | 'stars' | 'updated' | 'name'

export interface FilterState {
  query: string
  category: Category | 'ALL'
  language: string | 'ALL'
  sort: SortKey
}

export function filterRepos(repos: StarRepo[], state: FilterState) {
  const query = state.query.trim().toLowerCase()

  return repos
    .filter((repo) => !repo.hidden)
    .filter((repo) => state.category === 'ALL' || repo.category === state.category)
    .filter((repo) => state.language === 'ALL' || repo.language === state.language)
    .filter((repo) => {
      if (!query) return true
      return [repo.fullName, repo.description, repo.note, repo.language, ...repo.topics]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned)
      if (a.weight !== b.weight) return b.weight - a.weight

      switch (state.sort) {
        case 'stars':
          return b.stars - a.stars
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'name':
          return a.fullName.localeCompare(b.fullName)
        case 'starred':
        default:
          return new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime()
      }
    })
}
```

- [ ] **Step 2: 写页面渲染器**

```ts
import { SITE_DESCRIPTION, SITE_TITLE } from './config'
import { filterRepos, type FilterState, type SortKey } from './filter'
import type { Category, StarRepo, StarsPayload } from './types'

function uniqueLanguages(repos: StarRepo[]) {
  return Array.from(new Set(repos.map((repo) => repo.language).filter(Boolean))).sort()
}

function groupByCategory(repos: StarRepo[]) {
  return repos.reduce<Record<string, StarRepo[]>>((acc, repo) => {
    acc[repo.category] ??= []
    acc[repo.category].push(repo)
    return acc
  }, {})
}

function repoCard(repo: StarRepo) {
  const topics = repo.topics.map((topic) => `<span class="topic">${topic}</span>`).join('')
  const note = repo.note ? `<p class="repo-note">${repo.note}</p>` : ''
  const pinned = repo.pinned ? '<span class="badge">置顶</span>' : ''

  return `
    <article class="repo-card">
      <div class="repo-card__header">
        <a href="${repo.url}" target="_blank" rel="noreferrer">${repo.fullName}</a>
        ${pinned}
      </div>
      <p class="repo-description">${repo.description || '暂无描述'}</p>
      ${note}
      <div class="repo-meta">
        <span>${repo.language || 'Unknown'}</span>
        <span>⭐ ${repo.stars}</span>
        <span>Owner: ${repo.owner}</span>
      </div>
      <div class="repo-topics">${topics}</div>
    </article>
  `
}

function section(category: string, repos: StarRepo[]) {
  return `
    <section class="category-section">
      <div class="section-header">
        <h2>${category}</h2>
        <span>${repos.length} 个仓库</span>
      </div>
      <div class="repo-grid">
        ${repos.map(repoCard).join('')}
      </div>
    </section>
  `
}

export function renderApp(root: HTMLDivElement, payload: StarsPayload) {
  const state: FilterState = {
    query: '',
    category: 'ALL',
    language: 'ALL',
    sort: 'starred'
  }

  const languages = uniqueLanguages(payload.repos)

  const render = () => {
    const repos = filterRepos(payload.repos, state)
    const grouped = groupByCategory(repos)
    const content = Object.entries(grouped)
      .map(([category, items]) => section(category, items))
      .join('')

    root.innerHTML = `
      <main class="layout">
        <header class="hero">
          <h1>${SITE_TITLE}</h1>
          <p>${SITE_DESCRIPTION}</p>
          <div class="stats">
            <span>总计 ${payload.total} 个收藏</span>
            <span>${payload.categories.length} 个分类</span>
            <span>更新于 ${new Date(payload.generatedAt).toLocaleString('zh-CN')}</span>
          </div>
        </header>

        <section class="toolbar">
          <input id="query" placeholder="搜索仓库、描述、topic" value="${state.query}" />
          <select id="category">
            <option value="ALL">全部分类</option>
            ${payload.categories.map((category) => `<option value="${category}" ${state.category === category ? 'selected' : ''}>${category}</option>`).join('')}
          </select>
          <select id="language">
            <option value="ALL">全部语言</option>
            ${languages.map((language) => `<option value="${language}" ${state.language === language ? 'selected' : ''}>${language}</option>`).join('')}
          </select>
          <select id="sort">
            <option value="starred">最近收藏</option>
            <option value="stars">仓库 Stars</option>
            <option value="updated">最近更新</option>
            <option value="name">名称</option>
          </select>
        </section>

        <section class="results">${content || '<p class="empty-state">没有匹配的仓库</p>'}</section>
      </main>
    `

    root.querySelector<HTMLInputElement>('#query')?.addEventListener('input', (event) => {
      state.query = event.currentTarget.value
      render()
    })
    root.querySelector<HTMLSelectElement>('#category')?.addEventListener('change', (event) => {
      state.category = event.currentTarget.value as Category | 'ALL'
      render()
    })
    root.querySelector<HTMLSelectElement>('#language')?.addEventListener('change', (event) => {
      state.language = event.currentTarget.value
      render()
    })
    root.querySelector<HTMLSelectElement>('#sort')?.addEventListener('change', (event) => {
      state.sort = event.currentTarget.value as SortKey
      render()
    })
  }

  render()
}
```

- [ ] **Step 3: 写样式表**

```css
:root {
  color-scheme: dark;
  font-family: Inter, "Microsoft YaHei", sans-serif;
  background: #0b1020;
  color: #e8ecf3;
}

* { box-sizing: border-box; }
body { margin: 0; background: linear-gradient(180deg, #0b1020, #11182d); }
a { color: #8ac6ff; text-decoration: none; }

.layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}

.hero, .toolbar, .category-section, .error-state {
  background: rgba(18, 27, 48, 0.88);
  border: 1px solid rgba(138, 198, 255, 0.15);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
}

.hero { margin-bottom: 20px; }
.stats, .repo-meta, .repo-topics, .section-header { display: flex; gap: 12px; flex-wrap: wrap; }
.toolbar {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}
input, select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.12);
  background: #0f1730;
  color: #e8ecf3;
}

.category-section { margin-top: 20px; }
.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.repo-card {
  background: rgba(11, 16, 32, 0.9);
  border-radius: 16px;
  padding: 18px;
  border: 1px solid rgba(255,255,255,0.08);
}

.repo-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.badge, .topic {
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(138, 198, 255, 0.12);
  font-size: 12px;
}

.repo-description, .repo-note { color: #b8c2d6; }
.empty-state, .error-state { text-align: center; }

@media (max-width: 880px) {
  .toolbar { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: 运行构建验证页面层仍因缺少数据而失败**

Run: `npm run build`
Expected: 失败，提示 `data/stars.json` 缺失或数据脚本缺失

- [ ] **Step 5: 提交页面渲染层**

```bash
git add src/render.ts src/filter.ts src/style.css
git commit -m "feat: add stars hub UI and filters"
```

## Task 4: 实现 Stars 抓取与分类构建脚本

**Files:**
- Create: `scripts/fetch-stars.mjs`
- Create: `scripts/classify-stars.mjs`
- Create: `scripts/build-stars-data.mjs`
- Create: `data/overrides.json`
- Create: `data/stars.raw.json`
- Create: `data/stars.json`

- [ ] **Step 1: 写分类函数**

```js
const categoryRules = [
  { category: 'AI / LLM', keywords: ['ai', 'llm', 'agent', 'anthropic', 'openai', 'gpt', 'claude'] },
  { category: 'Frontend', keywords: ['frontend', 'react', 'vue', 'svelte', 'nextjs', 'vite', 'ui', 'component'] },
  { category: 'Backend', keywords: ['backend', 'server', 'api', 'express', 'fastapi', 'nest'] },
  { category: 'Fullstack', keywords: ['fullstack', 'saas'] },
  { category: 'DevTools', keywords: ['devtool', 'lint', 'formatter', 'build', 'plugin'] },
  { category: 'CLI', keywords: ['cli', 'terminal', 'shell', 'command'] },
  { category: 'Data / Database', keywords: ['database', 'db', 'sql', 'orm', 'postgres', 'mysql', 'redis'] },
  { category: 'Automation', keywords: ['automation', 'workflow', 'playwright', 'crawler', 'scraper'] },
  { category: 'Infra / Ops', keywords: ['docker', 'kubernetes', 'infra', 'terraform', 'devops'] },
  { category: 'Learning / Docs', keywords: ['docs', 'tutorial', 'guide', 'awesome', 'learning'] },
  { category: 'Design', keywords: ['design', 'figma', 'tailwind', 'animation'] }
]

export function classifyRepo(repo) {
  const haystack = [repo.name, repo.full_name, repo.description ?? '', ...(repo.topics ?? []), repo.language ?? '']
    .join(' ')
    .toLowerCase()

  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category
    }
  }

  return 'Misc'
}
```

- [ ] **Step 2: 写 GitHub Stars 抓取脚本**

```js
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
```

- [ ] **Step 3: 写构建最终数据脚本**

```js
import { readFile, writeFile } from 'node:fs/promises'
import { classifyRepo } from './classify-stars.mjs'

const raw = JSON.parse(await readFile('data/stars.raw.json', 'utf8'))
const overrides = JSON.parse(await readFile('data/overrides.json', 'utf8'))

const repos = raw.map((item) => {
  const repo = item.repo
  const fullName = repo.full_name
  const override = overrides[fullName] ?? {}
  const autoCategory = classifyRepo(repo)
  const category = override.category ?? autoCategory

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
const payload = {
  generatedAt: new Date().toISOString(),
  total: visible.length,
  categories: Array.from(new Set(visible.map((repo) => repo.category))),
  repos
}

await writeFile('data/stars.json', `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`Built stars.json with ${payload.total} visible repositories`)
```

- [ ] **Step 4: 初始化覆盖配置与占位数据**

```json
{}
```

```json
[]
```

```json
{
  "generatedAt": "1970-01-01T00:00:00.000Z",
  "total": 0,
  "categories": [],
  "repos": []
}
```

- [ ] **Step 5: 运行本地数据构建**

Run: `npm run data:build`
Expected: 成功生成 `data/stars.json`，日志显示 `Built stars.json`

- [ ] **Step 6: 提交数据脚本**

```bash
git add scripts/fetch-stars.mjs scripts/classify-stars.mjs scripts/build-stars-data.mjs data/overrides.json data/stars.json data/stars.raw.json
git commit -m "feat: add stars sync and classification pipeline"
```

## Task 5: 接通 README 与 GitHub Actions 发布

**Files:**
- Create: `.github/workflows/update-stars.yml`
- Modify: `README.zh-cn.md`

- [ ] **Step 1: 写 Actions 工作流**

```yaml
name: Update Stars Hub

on:
  workflow_dispatch:
  schedule:
    - cron: '0 1 * * *'

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Fetch stars
        env:
          GITHUB_STARS_OWNER: ${{ secrets.GITHUB_STARS_OWNER }}
          GH_PAT: ${{ secrets.GH_PAT }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run data:fetch

      - name: Build final data
        run: npm run data:build

      - name: Build site
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 在 README 增加入口说明区块**

```md
## 我的 GitHub Stars 导航页

我把自己的 GitHub Stars 自动汇总到了一个可搜索、可分类的页面里，方便后续查找。

- 在线浏览：`GitHub Pages 地址`
- 数据来源：GitHub Stars
- 更新方式：每日自动同步，也支持手动触发 GitHub Actions
```

- [ ] **Step 3: 运行完整构建验证发布产物**

Run: `npm run build`
Expected: 成功生成 `dist/`，无 TypeScript 或 Vite 构建错误

- [ ] **Step 4: 提交发布与文档接入**

```bash
git add .github/workflows/update-stars.yml README.zh-cn.md dist
git commit -m "feat: publish github stars hub to pages"
```

## Task 6: 本地验证与交付检查

**Files:**
- Verify only

- [ ] **Step 1: 启动本地预览**

Run: `npm run preview`
Expected: 本地页面可打开，筛选和搜索可用

- [ ] **Step 2: 运行一次真实数据抓取（配置好环境变量后）**

Run: `$env:GITHUB_STARS_OWNER="<your-github-id>"; $env:GH_PAT="<token>"; npm run data:fetch; npm run data:build`
Expected: `data/stars.raw.json` 和 `data/stars.json` 被真实数据填充

- [ ] **Step 3: 检查关键体验**

Expected:
- 页面顶部展示标题、摘要和更新时间
- 仓库按分类分组
- 搜索可以命中仓库名、描述和 topics
- 分类、语言、排序切换均可生效
- `hidden` 仓库不会显示
- `pinned` 与 `weight` 会影响排序

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "feat: build github stars hub"
```
