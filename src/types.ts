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

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}
