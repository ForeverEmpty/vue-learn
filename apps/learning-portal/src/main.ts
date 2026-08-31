import './style.css'
import { renderHomePage } from './pages/home'
import { renderRefEffectPage } from './pages/vue/ref-effect'
import { renderEffectCleanupPage } from './pages/vue/effect-cleanup'
import { renderEffectStackPage } from './pages/vue/effect-stack'
import { renderReactiveProxyPage } from './pages/vue/reactive-proxy'
import { renderDeepReactivePage } from './pages/vue/deep-reactive'
import { renderComputedPage } from './pages/vue/computed'
import { renderWatchSchedulerPage } from './pages/vue/watch-scheduler'
import { renderEffectLifecyclePage } from './pages/vue/effect-lifecycle'
import { renderSchedulerPage } from './pages/vue/scheduler'
import { renderPromiseBasicsPage } from './pages/vue/promise-basics'
import { renderReactiveObjectOperationsPage } from './pages/vue/reactive-object-operations'
import { renderPrototypeBasicsPage } from './pages/vue/prototype-basics'
import { renderCallApplyBindPage } from './pages/vue/call-apply-bind'
import { renderThisBindingPage } from './pages/vue/this-binding'
import { renderObjectDefinePropertyPage } from './pages/vue/object-define-property'
import { renderReactiveArrayLengthPage } from './pages/vue/reactive-array-length'
import { renderReactiveArrayMethodsPage } from './pages/vue/reactive-array-methods'
import { renderReadonlyIdentityPage } from './pages/vue/readonly-identity'
import { renderShallowReactivityPage } from './pages/vue/shallow-reactivity'
import { renderMarkRawPage } from './pages/vue/mark-raw'
import { renderJavaHomePage } from './pages/java/home'
import { renderJavaThreadBasicsPage } from './pages/java/thread-basics'

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
  '/basics/object-define-property': renderObjectDefinePropertyPage,
  '/chapter-11': renderReactiveArrayLengthPage,
  '/chapter-12': renderReactiveArrayMethodsPage,
  '/chapter-13': renderReadonlyIdentityPage,
  '/chapter-14': renderShallowReactivityPage,
  '/chapter-15': renderMarkRawPage,
  '/java': renderJavaHomePage,
  '/java/chapter-1': renderJavaThreadBasicsPage,
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
