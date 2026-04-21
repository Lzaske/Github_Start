# GitHub Stars Hub

Full Guide

## Overview

GitHub Stars Hub turns a GitHub account's starred repositories into a static, searchable directory that can be deployed on GitHub Pages.

It is designed for a simple workflow:

1. fetch starred repositories from GitHub
2. classify them into broad categories
3. optionally enrich descriptions with Simplified Chinese translations
4. apply manual overrides for curation
5. build a static site and publish it automatically

- Live site: <https://lzaske.github.io/Github_Start/>
- English entry page: [../../README.md](../../README.md)
- Chinese entry page: [../../README.zh-cn.md](../../README.zh-cn.md)
- Quick Start Guide: [portal.md](portal.md)

## What the project does

### 1. Sync GitHub Stars

[`scripts/fetch-stars.mjs`](../../scripts/fetch-stars.mjs) calls the GitHub starred repositories API and stores raw results in [`data/stars.raw.json`](../../data/stars.raw.json).

The script reads:

- `GITHUB_STARS_OWNER`
- `GH_PAT` or `GITHUB_TOKEN`

This keeps the source of truth close to GitHub while still producing a local static dataset.

### 2. Categorize repositories

[`scripts/classify-stars.mjs`](../../scripts/classify-stars.mjs) applies simple rule-based categorization using repository names, descriptions, topics, and language hints.

Current categories come from [`src/categories.json`](../../src/categories.json), including areas such as:

- AI / LLM
- Frontend
- Backend
- Fullstack
- DevTools
- CLI
- Data / Database
- Automation
- Infra / Ops
- Learning / Docs
- Design
- Misc

### 3. Support manual curation

Auto-categorization is only the first pass. [`data/overrides.json`](../../data/overrides.json) lets you manually adjust final output.

Supported per-repo overrides in the current implementation:

- `category`
- `hidden`
- `pinned`
- `note`
- `weight`

Example:

```json
{
  "microsoft/playwright": {
    "category": "Automation",
    "pinned": true,
    "note": "Browser automation and end-to-end testing",
    "weight": 10,
    "hidden": false
  }
}
```

### 4. Translate descriptions to Simplified Chinese

[`scripts/translate-descriptions.mjs`](../../scripts/translate-descriptions.mjs) can translate repository descriptions and cache them in [`data/translations.json`](../../data/translations.json).

Current behavior is implementation-accurate:

- translation is optional
- the active provider is selected by `TRANSLATION_PROVIDER`
- OpenAI translation uses `OPENAI_API_KEY`
- optional OpenAI settings are `OPENAI_RESPONSES_URL` and `OPENAI_TRANSLATION_MODEL`
- default model is `gpt-5.4-mini`
- default endpoint is `https://api.openai.com/v1/responses`
- translated entries store `provider`, `model`, and `updatedAt` metadata
- if translation is not configured, the pipeline skips safely
- if an OpenAI request fails, the script keeps existing cache data and skips the update safely

The site then prefers translated descriptions when present and falls back to the original description otherwise.

### 5. Build final site data

[`scripts/build-stars-data.mjs`](../../scripts/build-stars-data.mjs) merges raw stars, category output, overrides, and translations into [`data/stars.json`](../../data/stars.json).

The front end consumes that final payload instead of rebuilding logic in the browser.

### 6. Render a static site

The UI lives in [`src/`](../../src). It renders:

- total repo count
- category count
- generated time
- keyword search
- category filtering
- language filtering
- sorting
- description mode toggle between Chinese and original text

This keeps the site easy to host on GitHub Pages with no separate backend.

## Deployment model

The deployment workflow is defined in [`.github/workflows/update-stars.yml`](../../.github/workflows/update-stars.yml).

Current workflow behavior:

- triggers on `workflow_dispatch`
- triggers on a daily `schedule`
- runs `npm ci`
- fetches stars
- translates descriptions
- builds stars data
- builds the site
- uploads `dist`
- deploys to GitHub Pages

## Configuration

### GitHub Actions configuration

The workflow currently maps repository secrets and variables like this:

- Secret `STARS_OWNER` → `GITHUB_STARS_OWNER`
- Secret `GH_PAT`
- Variable `TRANSLATION_PROVIDER`
- Secret `TRANSLATION_API_KEY` for non-OpenAI providers such as the mock provider used in tests
- Secret `OPENAI_API_KEY`
- Variable `OPENAI_RESPONSES_URL`
- Variable `OPENAI_TRANSLATION_MODEL`

For real translated descriptions in this project, the relevant production path is:

- `TRANSLATION_PROVIDER=openai`
- `OPENAI_API_KEY=...`
- optional `OPENAI_RESPONSES_URL=...`
- optional `OPENAI_TRANSLATION_MODEL=...`

### Local development

Example PowerShell flow:

```powershell
$env:GITHUB_STARS_OWNER="your-name"
$env:GH_PAT="your-token"
$env:TRANSLATION_PROVIDER="openai"
$env:OPENAI_API_KEY="your-openai-key"
npm run data:fetch
npm run data:translate
npm run data:build
npm run dev
```

If you do not want translation, omit the translation variables and the translation step will skip safely.

## Repository structure

```text
.github/workflows/update-stars.yml
data/overrides.json
data/stars.raw.json
data/stars.json
data/translations.json
scripts/fetch-stars.mjs
scripts/translate-descriptions.mjs
scripts/build-stars-data.mjs
scripts/classify-stars.mjs
src/
README.md
README.zh-cn.md
docs/readme-variants/full.md
docs/readme-variants/portal.md
```

## Why this structure works

- static hosting keeps deployment simple
- raw data, translated cache, and final payload are separated cleanly
- rule-based categorization is cheap and predictable
- manual overrides preserve editorial control
- optional translation improves usability for Chinese browsing without making translation mandatory

## Recommended entry points

- English entry page: [../../README.md](../../README.md)
- Quick Start Guide: [portal.md](portal.md)
- Chinese entry page: [../../README.zh-cn.md](../../README.zh-cn.md)
- Live site: <https://lzaske.github.io/Github_Start/>
