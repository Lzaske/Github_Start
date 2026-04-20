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
