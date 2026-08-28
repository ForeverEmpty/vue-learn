export function renderPromiseBasicsPage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">MODULE 00 · LESSON 01</p>
        <h1>Promise 执行顺序</h1>
        <p class="lead">对照同步代码、Promise 微任务，以及保存在变量中的刷新 Promise。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">保存的变量类型</span>
            <strong id="promise-type" class="metric-value small-value">尚未创建</strong>
          </div>
          <div class="metric">
            <span class="result-label">当前阶段</span>
            <strong id="promise-stage" class="metric-value small-value">等待实验</strong>
          </div>
        </div>

        <div class="actions">
          <button id="run-promise-order" type="button">运行顺序实验</button>
          <button id="clear-promise-order" class="secondary" type="button">清空结果</button>
        </div>

        <ol id="promise-events" class="event-log" aria-live="polite"></ol>
      </section>
    </main>
  `

  const promiseType = container.querySelector<HTMLElement>('#promise-type')!
  const promiseStage = container.querySelector<HTMLElement>('#promise-stage')!
  const events = container.querySelector<HTMLOListElement>('#promise-events')!
  const runButton = container.querySelector<HTMLButtonElement>('#run-promise-order')!
  const clearButton = container.querySelector<HTMLButtonElement>('#clear-promise-order')!

  const appendEvent = (message: string): void => {
    const item = document.createElement('li')
    item.textContent = message
    events.append(item)
  }

  const clearResult = (): void => {
    events.replaceChildren()
    promiseType.textContent = '尚未创建'
    promiseStage.textContent = '等待实验'
  }

  runButton.addEventListener('click', () => {
    clearResult()
    runButton.disabled = true

    appendEvent('A · 同步代码开始')

    const currentPromise = Promise.resolve().then(() => {
      appendEvent('C · 第一个 Promise callback')
      promiseStage.textContent = '第一个微任务完成'
    })

    promiseType.textContent = 'Promise<void>'
    promiseStage.textContent = '等待微任务'
    appendEvent('B · 同步代码结束')

    void currentPromise.then(() => {
      appendEvent('D · currentPromise 完成后的 callback')
      promiseStage.textContent = '全部完成'
      runButton.disabled = false
    })
  })

  clearButton.addEventListener('click', clearResult)
}
