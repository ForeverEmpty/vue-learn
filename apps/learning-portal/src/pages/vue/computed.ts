import { computed, effect, ref } from 'mini-vue'

export function renderComputedPage(container: HTMLElement): void {
  const count = ref(1)
  let getterRuns = 0
  let consumerRuns = 0
  const doubled = computed(() => {
    getterRuns++
    return count.value * 2
  })

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 06</p>
        <h1>computed 的缓存与失效</h1>
        <p class="lead">观察 computed 何时执行 getter、何时复用缓存，以及依赖变化后怎样通知 effect。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">count.value</span>
            <strong id="source-value" class="metric-value">1</strong>
          </div>
          <div class="metric">
            <span class="result-label">computed.value</span>
            <strong id="computed-value" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">getter 执行次数</span>
            <strong id="getter-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">消费者 effect 次数</span>
            <strong id="consumer-runs" class="metric-value">0</strong>
          </div>
        </div>

        <div class="button-row">
          <button id="increment" type="button">修改 count</button>
          <button id="read-computed" type="button">再次读取 computed</button>
        </div>

        <p id="manual-read" class="hint">手动读取结果：尚未读取</p>
        <ol class="steps">
          <li>computed 创建时不应立即执行 getter。</li>
          <li>重复读取且依赖未变化时，getter 执行次数应保持不变。</li>
          <li>修改 count 后应先标记失效，下一次读取时才重新计算。</li>
        </ol>
      </section>
    </main>
  `

  const sourceValue = container.querySelector<HTMLElement>('#source-value')!
  const computedValue = container.querySelector<HTMLElement>('#computed-value')!
  const getterRunsElement = container.querySelector<HTMLElement>('#getter-runs')!
  const consumerRunsElement = container.querySelector<HTMLElement>('#consumer-runs')!
  const manualRead = container.querySelector<HTMLElement>('#manual-read')!
  const incrementButton = container.querySelector<HTMLButtonElement>('#increment')!
  const readButton = container.querySelector<HTMLButtonElement>('#read-computed')!

  effect(() => {
    consumerRuns++
    sourceValue.textContent = String(count.value)
    computedValue.textContent = String(doubled.value)
    getterRunsElement.textContent = String(getterRuns)
    consumerRunsElement.textContent = String(consumerRuns)
  })

  incrementButton.addEventListener('click', () => {
    count.value++
  })

  readButton.addEventListener('click', () => {
    manualRead.textContent = `手动读取结果：${doubled.value}，getter 已执行 ${getterRuns} 次`
    getterRunsElement.textContent = String(getterRuns)
  })
}
