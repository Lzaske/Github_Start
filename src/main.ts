import './style.css'

import payload from '../data/stars.json'
import { renderApp } from './render'
import type { StarsPayload } from './types'

async function bootstrap() {
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) {
    throw new Error('App container not found')
  }

  renderApp(app, payload as StarsPayload)
}

bootstrap().catch((error) => {
  const app = document.querySelector<HTMLDivElement>('#app')

  if (app) {
    const message = error instanceof Error ? error.message.replaceAll('<', '&lt;').replaceAll('>', '&gt;') : '未知错误'
    app.innerHTML = `<main class="error-state"><h1>加载失败</h1><p>${message}</p></main>`
  }
})
