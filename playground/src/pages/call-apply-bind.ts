export function renderCallApplyBindPage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">MODULE 00 · LESSON 03</p>
        <h1>call、apply 与 bind</h1>
        <p class="lead">观察 call/apply 立即执行，bind 返回新函数，以及三者如何指定普通函数的 this。</p>

        <div class="actions">
          <button id="run-call-bind-demo" type="button">运行调用实验</button>
          <button id="clear-call-bind-demo" class="secondary" type="button">清空结果</button>
        </div>

        <ol id="call-bind-events" class="event-log" aria-live="polite"></ol>
      </section>
    </main>
  `

  const events = container.querySelector<HTMLOListElement>('#call-bind-events')!
  const runButton = container.querySelector<HTMLButtonElement>('#run-call-bind-demo')!
  const clearButton = container.querySelector<HTMLButtonElement>('#clear-call-bind-demo')!

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

    function introduce(this: { name: string }, greeting: string, punctuation: string): string {
      return `${greeting}, ${this.name}${punctuation}`
    }

    const person = { name: 'Ada' }
    const callResult = introduce.call(person, 'Hello', '!')
    const applyResult = introduce.apply(person, ['Hi', '?'])
    const boundIntroduce = introduce.bind(person, 'Welcome')

    appendEvent(`call 结果：${callResult}`)
    appendEvent(`apply 结果：${applyResult}`)
    appendEvent(`bind 返回类型：${typeof boundIntroduce}`)
    appendEvent(`bind 调用结果：${boundIntroduce('.')}`)
  })

  clearButton.addEventListener('click', clearResult)
}
