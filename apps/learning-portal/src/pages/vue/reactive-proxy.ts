import { effect, reactive } from 'mini-vue'

export function renderReactiveProxyPage(container: HTMLElement): void {
  const state = reactive({
    count: 0,
    title: 'Mini Vue',
    unused: 0,
  })
  let countRuns = 0
  let titleRuns = 0

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 04</p>
        <h1>Proxy 与浅层 reactive</h1>
        <p class="lead">三个属性属于同一对象，但读取它们的 effect 应保持相互独立。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">count 显示值</span>
            <strong id="count-value" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">count effect 次数</span>
            <strong id="count-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">title 显示值</span>
            <strong id="title-value" class="metric-value small-value"></strong>
          </div>
          <div class="metric">
            <span class="result-label">title effect 次数</span>
            <strong id="title-runs" class="metric-value">0</strong>
          </div>
        </div>

        <div class="actions">
          <button id="update-count" type="button">修改 count</button>
          <button id="update-title" class="secondary" type="button">修改 title</button>
          <button id="update-unused" class="secondary" type="button">修改未使用属性</button>
        </div>

        <ol class="steps">
          <li>当前起点代码中，对象会被修改，但页面不会重新渲染。</li>
          <li>完成本章后，修改 count 只能增加 count effect 次数。</li>
          <li>修改 title 只能增加 title effect 次数。</li>
          <li>修改 unused 不应该增加任何 effect 次数。</li>
        </ol>
      </section>
    </main>
  `

  const countValue = container.querySelector<HTMLElement>('#count-value')!
  const countRunsElement = container.querySelector<HTMLElement>('#count-runs')!
  const titleValue = container.querySelector<HTMLElement>('#title-value')!
  const titleRunsElement = container.querySelector<HTMLElement>('#title-runs')!
  const updateCountButton = container.querySelector<HTMLButtonElement>('#update-count')!
  const updateTitleButton = container.querySelector<HTMLButtonElement>('#update-title')!
  const updateUnusedButton = container.querySelector<HTMLButtonElement>('#update-unused')!

  effect(() => {
    countRuns++
    countValue.textContent = String(state.count)
    countRunsElement.textContent = String(countRuns)
  })

  effect(() => {
    titleRuns++
    titleValue.textContent = state.title
    titleRunsElement.textContent = String(titleRuns)
  })

  updateCountButton.addEventListener('click', () => {
    state.count++
  })

  updateTitleButton.addEventListener('click', () => {
    state.title = state.title === 'Mini Vue' ? 'Reactive Proxy' : 'Mini Vue'
  })

  updateUnusedButton.addEventListener('click', () => {
    state.unused++
  })
}
