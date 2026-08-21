import { effect, reactive } from 'mini-vue'

type Profile = {
  name?: string
  age?: number
}

export function renderReactiveObjectOperationsPage(container: HTMLElement): void {
  const state = reactive<Profile>({ name: 'Ada' })
  let hasRuns = 0
  let keysRuns = 0
  let valueRuns = 0

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 10</p>
        <h1>对象结构操作</h1>
        <p class="lead">观察属性读取、in、Object.keys 和 delete 分别经过哪些 Proxy trap。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">'name' in state</span>
            <strong id="has-name" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">has effect 次数</span>
            <strong id="has-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">Object.keys</span>
            <strong id="object-keys" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">keys effect 次数</span>
            <strong id="keys-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">state.name</span>
            <strong id="name-value" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">value effect 次数</span>
            <strong id="value-runs" class="metric-value">0</strong>
          </div>
        </div>

        <div class="actions">
          <button id="add-age" type="button">新增 age</button>
          <button id="rename" type="button">修改 name</button>
          <button id="delete-name" type="button">删除 name</button>
          <button id="restore-name" class="secondary" type="button">恢复 name</button>
        </div>

        <ol class="steps">
          <li>起点实现中，新增 age 后 Object.keys 不会更新。</li>
          <li>删除 name 后，in、Object.keys 和直接读取都不会更新。</li>
          <li>修改已有 name 会触发共用 name dep 的 has/value effect，但不会触发只依赖键集合的 keys effect。</li>
        </ol>
      </section>
    </main>
  `

  const hasName = container.querySelector<HTMLElement>('#has-name')!
  const hasRunsElement = container.querySelector<HTMLElement>('#has-runs')!
  const objectKeys = container.querySelector<HTMLElement>('#object-keys')!
  const keysRunsElement = container.querySelector<HTMLElement>('#keys-runs')!
  const nameValue = container.querySelector<HTMLElement>('#name-value')!
  const valueRunsElement = container.querySelector<HTMLElement>('#value-runs')!

  effect(() => {
    hasRuns++
    hasName.textContent = String('name' in state)
    hasRunsElement.textContent = String(hasRuns)
  })

  effect(() => {
    keysRuns++
    objectKeys.textContent = Object.keys(state).join(', ') || '(empty)'
    keysRunsElement.textContent = String(keysRuns)
  })

  effect(() => {
    valueRuns++
    nameValue.textContent = state.name ?? '(deleted)'
    valueRunsElement.textContent = String(valueRuns)
  })

  container.querySelector<HTMLButtonElement>('#add-age')!.addEventListener('click', () => {
    state.age = 36
  })

  container.querySelector<HTMLButtonElement>('#rename')!.addEventListener('click', () => {
    state.name = 'Grace'
  })

  container.querySelector<HTMLButtonElement>('#delete-name')!.addEventListener('click', () => {
    delete state.name
  })

  container.querySelector<HTMLButtonElement>('#restore-name')!.addEventListener('click', () => {
    state.name = 'Ada'
  })
}
