export function renderPrototypeBasicsPage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">MODULE 00 · LESSON 02</p>
        <h1>原型与属性归属</h1>
        <p class="lead">对比 in、hasOwnProperty.call 和 Object.keys，观察自有属性与原型属性的区别。</p>

        <div class="actions">
          <button id="run-prototype-demo" type="button">运行原型实验</button>
          <button id="clear-prototype-demo" class="secondary" type="button">清空结果</button>
        </div>

        <ol id="prototype-events" class="event-log" aria-live="polite"></ol>
      </section>
    </main>
  `

  const events = container.querySelector<HTMLOListElement>('#prototype-events')!
  const runButton = container.querySelector<HTMLButtonElement>('#run-prototype-demo')!
  const clearButton = container.querySelector<HTMLButtonElement>('#clear-prototype-demo')!

  const clearResult = (): void => {
    events.replaceChildren()
  }

  const appendEvent = (message: string): void => {
    const item = document.createElement('li')
    item.textContent = message
    events.append(item)
  }

  runButton.addEventListener('click', () => {
    clearResult()

    const parent = { inherited: '来自原型' }
    const child = Object.create(parent) as Record<string, string>
    child.own = '来自对象自己'
    const shadowed = { hasOwnProperty: '被覆盖了' }
    const nullPrototypeObject = Object.create(null) as Record<string, number>
    nullPrototypeObject.count = 1

    appendEvent(`'inherited' in child = ${'inherited' in child}`)
    appendEvent(`hasOwn(child, 'inherited') = ${Object.prototype.hasOwnProperty.call(child, 'inherited')}`)
    appendEvent(`hasOwn(child, 'own') = ${Object.prototype.hasOwnProperty.call(child, 'own')}`)
    appendEvent(`Object.keys(child) = ${Object.keys(child).join(', ')}`)
    appendEvent(`child.hasOwnProperty = ${String(typeof child.hasOwnProperty)}`)
    appendEvent(`shadowed.hasOwnProperty = ${String(shadowed.hasOwnProperty)}`)
    appendEvent(`nullPrototypeObject.hasOwnProperty = ${String(nullPrototypeObject.hasOwnProperty)}`)
    appendEvent(`hasOwn(nullPrototypeObject, 'count') = ${Object.prototype.hasOwnProperty.call(nullPrototypeObject, 'count')}`)
  })

  clearButton.addEventListener('click', clearResult)
}
