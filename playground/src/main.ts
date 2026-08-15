import './style.css'
import { renderHomePage } from './pages/home'
import { renderRefEffectPage } from './pages/ref-effect'
import { renderEffectCleanupPage } from './pages/effect-cleanup'
import { renderEffectStackPage } from './pages/effect-stack'
import { renderReactiveProxyPage } from './pages/reactive-proxy'

type PageRenderer = (container: HTMLElement) => void

const routes: Record<string, PageRenderer> = {
  '/': renderHomePage,
  '/chapter-1': renderRefEffectPage,
  '/chapter-2': renderEffectCleanupPage,
  '/chapter-3': renderEffectStackPage,
  '/chapter-4': renderReactiveProxyPage,
}

const app = document.querySelector<HTMLElement>('#app')!

function getCurrentPath(): string {
  const path = window.location.hash.slice(1)
  return path || '/'
}

function renderCurrentPage(): void {
  const currentPath = getCurrentPath()
  const renderPage = routes[currentPath] ?? renderHomePage

  app.replaceChildren()
  renderPage(app)
  window.scrollTo({ top: 0 })
}

window.addEventListener('hashchange', renderCurrentPage)
renderCurrentPage()
