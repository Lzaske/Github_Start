import { SITE_DESCRIPTION, SITE_TITLE } from './config'
import { filterRepos, type FilterState, type SortKey } from './filter'
import { CATEGORIES, type Category, type StarRepo, type StarsPayload } from './types'

type DescriptionMode = 'zh' | 'original'

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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function getRepoDescription(repo: StarRepo, mode: DescriptionMode) {
  if (mode === 'original') return repo.description || '暂无描述'

  return repo.descriptionZh || repo.description || '暂无描述'
}

function repoCard(repo: StarRepo, mode: DescriptionMode) {
  const topics = repo.topics.map((topic) => `<span class="topic">${escapeHtml(topic)}</span>`).join('')
  const note = repo.note ? `<p class="repo-note">${escapeHtml(repo.note)}</p>` : ''
  const pinned = repo.pinned ? '<span class="badge">置顶</span>' : ''

  return `
    <article class="repo-card">
      <div class="repo-card__header">
        <a href="${repo.url}" target="_blank" rel="noreferrer">${escapeHtml(repo.fullName)}</a>
        ${pinned}
      </div>
      <p class="repo-description">${escapeHtml(getRepoDescription(repo, mode))}</p>
      ${note}
      <div class="repo-meta">
        <span>${escapeHtml(repo.language || '未知')}</span>
        <span>⭐ ${repo.stars}</span>
        <span>仓库作者：${escapeHtml(repo.owner)}</span>
      </div>
      <div class="repo-topics">${topics}</div>
    </article>
  `
}

function section(category: string, repos: StarRepo[], mode: DescriptionMode) {
  return `
    <section class="category-section">
      <div class="section-header">
        <h2>${escapeHtml(category)}</h2>
        <span>${repos.length} 个仓库</span>
      </div>
      <div class="repo-grid">
        ${repos.map((repo) => repoCard(repo, mode)).join('')}
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
  let descriptionMode: DescriptionMode = 'zh'

  const languages = uniqueLanguages(payload.repos)

  const render = () => {
    const repos = filterRepos(payload.repos, state)
    const grouped = groupByCategory(repos)
    const content = CATEGORIES.filter((category) => grouped[category]?.length)
      .map((category) => section(category, grouped[category], descriptionMode))
      .join('')

    root.innerHTML = `
      <main class="layout">
        <header class="hero">
          <p class="eyebrow">星标索引</p>
          <h1>${SITE_TITLE}</h1>
          <p>${SITE_DESCRIPTION}</p>
          <div class="stats">
            <span>总计 ${payload.total} 个收藏</span>
            <span>${payload.categories.length} 个分类</span>
            <span>更新于 ${new Date(payload.generatedAt).toLocaleString('zh-CN')}</span>
          </div>
        </header>

        <section class="toolbar">
          <input id="query" aria-label="搜索仓库" placeholder="搜索仓库、描述、topic" value="${escapeHtml(state.query)}" />
          <select id="category" aria-label="按分类筛选">
            <option value="ALL">全部分类</option>
            ${payload.categories.map((category) => `<option value="${category}" ${state.category === category ? 'selected' : ''}>${category}</option>`).join('')}
          </select>
          <select id="language" aria-label="按语言筛选">
            <option value="ALL">全部语言</option>
            ${languages.map((language) => `<option value="${language}" ${state.language === language ? 'selected' : ''}>${language}</option>`).join('')}
          </select>
          <select id="sort" aria-label="排序方式">
            ${[
              ['starred', '最近收藏'],
              ['stars', '仓库 Stars'],
              ['updated', '最近更新'],
              ['name', '名称']
            ]
              .map(([value, label]) => `<option value="${value}" ${state.sort === value ? 'selected' : ''}>${label}</option>`)
              .join('')}
          </select>
          <select id="description-mode" aria-label="描述显示模式">
            ${[
              ['zh', '中文描述'],
              ['original', '原始描述']
            ]
              .map(([value, label]) => `<option value="${value}" ${descriptionMode === value ? 'selected' : ''}>${label}</option>`)
              .join('')}
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
    root.querySelector<HTMLSelectElement>('#description-mode')?.addEventListener('change', (event) => {
      descriptionMode = event.currentTarget.value as DescriptionMode
      render()
    })
  }

  render()
}
