export function renderThisBindingPage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">MODULE 00 · LESSON 04</p>
        <h1>this 的指向</h1>
        <p class="lead">比较对象方法、函数提取、call 和 bind 的调用位置如何决定普通函数的 this。</p>

        <div class="actions">
          <button id="run-this-demo" type="button">运行 this 实验</button>
          <button id="clear-this-demo" class="secondary" type="button">清空结果</button>
        </div>

        <ol id="this-events" class="event-log" aria-live="polite"></ol>
      </section>
    </main>
  `

  const events = container.querySelector<HTMLOListElement>('#this-events')!
  const runButton = container.querySelector<HTMLButtonElement>('#run-this-demo')!
  const clearButton = container.querySelector<HTMLButtonElement>('#clear-this-demo')!

  const appendEvent = (message: string): void => {
    const item = document.createElement('li')
    item.textContent = message
    events.append(item)
  }

  const clearResult = (): void => {
    events.replaceChildren()
  }

  runButton.addEventListener('click', () => {
    clearResult()

    const first = {
      name: 'Ada',
      getName(this: { name: string }) {
        return this.name
      },
    }
    const second = { name: 'Grace' }
    const method = first.getName
    const boundMethod = method.bind(second)

    appendEvent(`first.getName() = ${first.getName()}`)
    appendEvent(`method.call(second) = ${method.call(second)}`)
    appendEvent(`boundMethod() = ${boundMethod()}`)
    appendEvent(`method 的类型 = ${typeof method}`)
  })

  clearButton.addEventListener('click', clearResult)
}
