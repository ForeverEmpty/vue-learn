import './style.css'
import { renderHomePage } from './pages/home'
import { renderRefEffectPage } from './pages/ref-effect'
import { renderEffectCleanupPage } from './pages/effect-cleanup'
import { renderEffectStackPage } from './pages/effect-stack'
import { renderReactiveProxyPage } from './pages/reactive-proxy'
import { renderDeepReactivePage } from './pages/deep-reactive'
import { renderComputedPage } from './pages/computed'
import { renderWatchSchedulerPage } from './pages/watch-scheduler'
import { renderEffectLifecyclePage } from './pages/effect-lifecycle'
import { renderSchedulerPage } from './pages/scheduler'
import { renderPromiseBasicsPage } from './pages/promise-basics'
import { renderReactiveObjectOperationsPage } from './pages/reactive-object-operations'
import { renderPrototypeBasicsPage } from './pages/prototype-basics'
import { renderCallApplyBindPage } from './pages/call-apply-bind'
import { renderThisBindingPage } from './pages/this-binding'

type PageRenderer = (container: HTMLElement) => void

const routes: Record<string, PageRenderer> = {
  '/': renderHomePage,
  '/chapter-1': renderRefEffectPage,
  '/chapter-2': renderEffectCleanupPage,
  '/chapter-3': renderEffectStackPage,
  '/chapter-4': renderReactiveProxyPage,
  '/chapter-5': renderDeepReactivePage,
  '/chapter-6': renderComputedPage,
  '/chapter-7': renderWatchSchedulerPage,
  '/chapter-8': renderEffectLifecyclePage,
  '/chapter-9': renderSchedulerPage,
  '/basics/promise': renderPromiseBasicsPage,
  '/chapter-10': renderReactiveObjectOperationsPage,
  '/basics/prototype': renderPrototypeBasicsPage,
  '/basics/call-apply-bind': renderCallApplyBindPage,
  '/basics/this': renderThisBindingPage,
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
