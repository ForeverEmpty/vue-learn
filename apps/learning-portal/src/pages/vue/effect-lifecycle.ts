import { effect, ref, stop, type EffectRunner } from 'mini-vue'

export function renderEffectLifecyclePage(container: HTMLElement): void {
  const count = ref(0)
  let runs = 0
  let runner: EffectRunner

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 08</p>
        <h1>effect 生命周期与 stop</h1>
        <p class="lead">观察 effect 的自动追踪、停止订阅，以及 stop 后 runner 的手动执行行为。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">count.value</span>
            <strong id="count-value" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">effect 执行次数</span>
            <strong id="effect-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">effect 状态</span>
            <strong id="effect-status" class="metric-value small-value">追踪中</strong>
          </div>
          <div class="metric">
            <span class="result-label">页面观察值</span>
            <strong id="observed-value" class="metric-value">0</strong>
          </div>
        </div>

        <div class="button-row">
          <button id="increment" type="button">修改 count</button>
          <button id="stop" type="button">停止 effect</button>
          <button id="run" type="button">手动 runner</button>
        </div>

        <ol class="steps">
          <li>修改 count 时，追踪中的 effect 会自动执行。</li>
          <li>停止后修改 count，不应再自动执行。</li>
          <li>手动 runner 可以执行一次，但停止状态不会重新收集依赖。</li>
        </ol>
      </section>
    </main>
  `

  const countValue = container.querySelector<HTMLElement>('#count-value')!
  const effectRuns = container.querySelector<HTMLElement>('#effect-runs')!
  const effectStatus = container.querySelector<HTMLElement>('#effect-status')!
  const observedValue = container.querySelector<HTMLElement>('#observed-value')!
  const incrementButton = container.querySelector<HTMLButtonElement>('#increment')!
  const stopButton = container.querySelector<HTMLButtonElement>('#stop')!
  const runButton = container.querySelector<HTMLButtonElement>('#run')!

  runner = effect(() => {
    runs++
    countValue.textContent = String(count.value)
    effectRuns.textContent = String(runs)
    observedValue.textContent = String(count.value)
  })

  incrementButton.addEventListener('click', () => {
    count.value++
  })

  stopButton.addEventListener('click', () => {
    stop(runner)
    effectStatus.textContent = '已停止'
  })

  runButton.addEventListener('click', () => {
    runner()
    effectRuns.textContent = String(runs)
    observedValue.textContent = String(count.value)
  })
}
