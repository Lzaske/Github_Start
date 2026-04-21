# GitHub Stars Hub

Quick Start Guide

## One-line summary

Turn GitHub Stars into a clean static hub with sync, categorization, optional Chinese translation, and GitHub Pages deployment.

## Go where you need

- Live site: <https://lzaske.github.io/Github_Start/>
- English entry page: [../../README.md](../../README.md)
- Chinese entry page: [../../README.zh-cn.md](../../README.zh-cn.md)
- Full Guide: [full.md](full.md)

## What it already does

- Syncs starred repositories from GitHub
- Classifies repos into practical categories
- Lets you override category, note, pinned, hidden, and weight values
- Optionally translates descriptions to Simplified Chinese with OpenAI
- Publishes a static site through GitHub Actions and GitHub Pages

## Key files

- Fetch: [`../../scripts/fetch-stars.mjs`](../../scripts/fetch-stars.mjs)
- Translate: [`../../scripts/translate-descriptions.mjs`](../../scripts/translate-descriptions.mjs)
- Build data: [`../../scripts/build-stars-data.mjs`](../../scripts/build-stars-data.mjs)
- Overrides: [`../../data/overrides.json`](../../data/overrides.json)
- Workflow: [`../../.github/workflows/update-stars.yml`](../../.github/workflows/update-stars.yml)

## Translation config

- Enable with `TRANSLATION_PROVIDER=openai`
- Required: `OPENAI_API_KEY`
- Optional: `OPENAI_RESPONSES_URL`
- Optional: `OPENAI_TRANSLATION_MODEL`
- Default model: `gpt-5.4-mini`

## Prefer the shorter path?

Open the live site if you want the product.

Open [full.md](full.md) if you want the implementation and deployment details.

Open [../../README.md](../../README.md) for the English entry page, or [../../README.zh-cn.md](../../README.zh-cn.md) for the Chinese entry page.
