const categoryRules = [
  { category: 'AI / LLM', keywords: ['ai', 'llm', 'agent', 'anthropic', 'openai', 'gpt', 'claude'] },
  { category: 'Frontend', keywords: ['frontend', 'react', 'vue', 'svelte', 'nextjs', 'vite', 'ui', 'component'] },
  { category: 'Backend', keywords: ['backend', 'server', 'api', 'express', 'fastapi', 'nest'] },
  { category: 'Fullstack', keywords: ['fullstack', 'saas'] },
  { category: 'DevTools', keywords: ['devtool', 'lint', 'formatter', 'build', 'plugin'] },
  { category: 'CLI', keywords: ['cli', 'terminal', 'shell', 'command'] },
  { category: 'Data / Database', keywords: ['database', 'postgres', 'mysql', 'redis', 'orm', 'sql'] },
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
