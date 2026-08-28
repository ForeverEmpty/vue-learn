import { effect, reactive } from 'mini-vue'

export function renderReactiveArrayMethodsPage(container: HTMLElement): void {
  const rawItem = { id: 1 }
  const objectList = reactive([rawItem])
  const rawNumberList: number[] = []
  const numberList = reactive(rawNumberList)
  let searchRuns = 0
  let mutationEffectRuns = 0
  let mutationSchedulerCalls = 0

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 12</p>
        <h1>数组方法的身份处理与依赖暂停</h1>
        <p class="lead">观察 includes 的 raw/Proxy 身份差异，以及 push 在 effect 中产生的意外依赖。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">includes(rawItem)</span>
            <strong id="includes-raw" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">indexOf(rawItem)</span>
            <strong id="index-of-raw" class="metric-value">-1</strong>
          </div>
          <div class="metric">
            <span class="result-label">搜索 effect 次数</span>
            <strong id="search-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">变更方法 effect 次数</span>
            <strong id="mutation-effect-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">意外 scheduler 次数</span>
            <strong id="mutation-scheduler-calls" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">numberList.length</span>
            <strong id="number-length" class="metric-value">0</strong>
          </div>
        </div>

        <div class="actions">
          <button id="append-raw" type="button">再次加入 rawItem</button>
          <button id="external-push" type="button">在 effect 外 push</button>
          <button id="replace-first" class="secondary" type="button">替换首个对象</button>
        </div>

        <ol class="steps">
          <li>起点实现中，数组 getter 会把元素对象变成 Proxy，因此 includes(rawItem) 和 indexOf(rawItem) 找不到原对象。</li>
          <li>effect 内执行 push 时，原生 push 会读取 length；起点实现会把这个内部读取错误地收集为 effect 依赖。</li>
          <li>点击“在 effect 外 push”，起点实现会调用该 effect 的 scheduler；完成依赖暂停后不应再增加。</li>
          <li>搜索方法修复身份比较后，仍必须追踪索引和 length，不能为了使用原数组而失去响应式。</li>
        </ol>
      </section>
    </main>
  `

  const includesRawElement = container.querySelector<HTMLElement>('#includes-raw')!
  const indexOfRawElement = container.querySelector<HTMLElement>('#index-of-raw')!
  const searchRunsElement = container.querySelector<HTMLElement>('#search-runs')!
  const mutationEffectRunsElement = container.querySelector<HTMLElement>('#mutation-effect-runs')!
  const mutationSchedulerCallsElement = container.querySelector<HTMLElement>(
    '#mutation-scheduler-calls',
  )!
  const numberLengthElement = container.querySelector<HTMLElement>('#number-length')!

  function updateMutationMetrics(): void {
    mutationEffectRunsElement.textContent = String(mutationEffectRuns)
    mutationSchedulerCallsElement.textContent = String(mutationSchedulerCalls)
    numberLengthElement.textContent = String(rawNumberList.length)
  }

  effect(() => {
    searchRuns++
    includesRawElement.textContent = String(objectList.includes(rawItem))
    indexOfRawElement.textContent = String(objectList.indexOf(rawItem))
    searchRunsElement.textContent = String(searchRuns)
  })

  effect(
    () => {
      mutationEffectRuns++
      numberList.push(mutationEffectRuns)
      updateMutationMetrics()
    },
    {
      scheduler: () => {
        mutationSchedulerCalls++
        updateMutationMetrics()
      },
    },
  )

  container.querySelector<HTMLButtonElement>('#append-raw')!.addEventListener('click', () => {
    objectList.push(rawItem)
  })

  container.querySelector<HTMLButtonElement>('#external-push')!.addEventListener('click', () => {
    numberList.push(rawNumberList.length + 1)
    updateMutationMetrics()
  })

  container.querySelector<HTMLButtonElement>('#replace-first')!.addEventListener('click', () => {
    objectList[0] = { id: objectList[0].id + 1 }
  })
}
