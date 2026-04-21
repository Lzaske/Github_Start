import categories from './categories.json'

export const CATEGORIES = categories as readonly string[]

export type Category = (typeof CATEGORIES)[number]

export type TranslationStatus = 'translated' | 'fallback' | 'skipped'

export interface TranslationEntry {
  source: string
  translated: string
  provider?: string
  model?: string
  updatedAt?: string
}

export interface StarRepo {
  fullName: string
  name: string
  owner: string
  url: string
  description: string
  descriptionZh: string
  translationStatus: TranslationStatus
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
