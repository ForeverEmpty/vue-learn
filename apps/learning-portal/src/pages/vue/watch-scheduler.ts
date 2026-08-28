import { ref, watch } from 'mini-vue'

export function renderWatchSchedulerPage(container: HTMLElement): void {
  const count = ref(0)
  const label = ref('A')
  let callbackRuns = 0

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 07</p>
        <h1>watch 与调度隔离</h1>
        <p class="lead">watch 只应追踪 source；callback 中读取的其他响应式值不应变成 watch 依赖。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">source count</span>
            <strong id="count-value" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">callback 读取的 label</span>
            <strong id="label-value" class="metric-value small-value">A</strong>
          </div>
          <div class="metric">
            <span class="result-label">callback 执行次数</span>
            <strong id="callback-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">最后一次变化</span>
            <strong id="last-change" class="metric-value small-value">尚未触发</strong>
          </div>
        </div>

        <div class="button-row">
          <button id="update-count" type="button">修改 source</button>
          <button id="update-label" type="button">只修改 label</button>
        </div>

        <ol class="steps">
          <li>先修改 source，callback 会执行并读取 label。</li>
          <li>再只修改 label；起点实现会错误地再次执行 callback。</li>
          <li>使用 scheduler 隔离后，修改 label 不再触发 watch。</li>
        </ol>
      </section>
    </main>
  `

  const countValue = container.querySelector<HTMLElement>('#count-value')!
  const labelValue = container.querySelector<HTMLElement>('#label-value')!
  const callbackRunsElement = container.querySelector<HTMLElement>('#callback-runs')!
  const lastChange = container.querySelector<HTMLElement>('#last-change')!
  const updateCountButton = container.querySelector<HTMLButtonElement>('#update-count')!
  const updateLabelButton = container.querySelector<HTMLButtonElement>('#update-label')!

  watch(
    () => count.value,
    (newValue, oldValue) => {
      callbackRuns++
      labelValue.textContent = label.value
      callbackRunsElement.textContent = String(callbackRuns)
      lastChange.textContent = `${oldValue} → ${newValue}`
    },
  )

  updateCountButton.addEventListener('click', () => {
    count.value++
    countValue.textContent = String(count.value)
  })

  updateLabelButton.addEventListener('click', () => {
    label.value = label.value === 'A' ? 'B' : 'A'
    labelValue.textContent = label.value
  })
}
