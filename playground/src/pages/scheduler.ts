import { effect, nextTick, queueJob, ref } from 'mini-vue'

export function renderSchedulerPage(container: HTMLElement): void {
  const count = ref(0)
  let runs = 0
  let runner!: () => void

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 09</p>
        <h1>scheduler 队列与 nextTick</h1>
        <p class="lead">观察 scheduler 如何把同步触发改成微任务刷新，并用 Set 合并同一 tick 内的重复 job。</p>

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
            <span class="result-label">刷新状态</span>
            <strong id="flush-status" class="metric-value small-value">尚未修改</strong>
          </div>
          <div class="metric">
            <span class="result-label">nextTick 读取值</span>
            <strong id="next-tick-value" class="metric-value">-</strong>
          </div>
        </div>

        <div class="button-row">
          <button id="update-twice" type="button">同一 tick 修改两次</button>
          <button id="read-next-tick" type="button">读取 nextTick</button>
        </div>

        <ol class="steps">
          <li>修改两次后，当前同步起点会立即执行两次。</li>
          <li>队列实现后，同一 job 只保留一份。</li>
          <li>nextTick callback 会在队列刷新后读取最新值。</li>
        </ol>
      </section>
    </main>
  `

  const countValue = container.querySelector<HTMLElement>('#count-value')!
  const effectRuns = container.querySelector<HTMLElement>('#effect-runs')!
  const flushStatus = container.querySelector<HTMLElement>('#flush-status')!
  const nextTickValue = container.querySelector<HTMLElement>('#next-tick-value')!
  const updateTwiceButton = container.querySelector<HTMLButtonElement>('#update-twice')!
  const readNextTickButton = container.querySelector<HTMLButtonElement>('#read-next-tick')!

  runner = effect(
    () => {
      runs++
      countValue.textContent = String(count.value)
      effectRuns.textContent = String(runs)
      flushStatus.textContent = 'effect 已执行'
    },
    {
      scheduler: () => queueJob(runner),
    },
  )

  updateTwiceButton.addEventListener('click', () => {
    count.value++
    count.value++
    flushStatus.textContent = '等待刷新'
  })

  readNextTickButton.addEventListener('click', () => {
    nextTick(() => {
      nextTickValue.textContent = String(count.value)
      flushStatus.textContent = 'nextTick 已执行'
    })
  })
}
