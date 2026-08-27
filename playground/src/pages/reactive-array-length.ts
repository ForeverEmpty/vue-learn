import { effect, reactive } from 'mini-vue'

export function renderReactiveArrayLengthPage(container: HTMLElement): void {
  const list = reactive(['A', 'B', 'C'])
  let lengthRuns = 0
  let thirdItemRuns = 0
  let keysRuns = 0

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 11</p>
        <h1>响应式数组的索引与 length</h1>
        <p class="lead">观察数组索引、length 和 Object.keys 之间不是单向的一对一关系。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">effect 看到的 length</span>
            <strong id="array-length" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">length effect 次数</span>
            <strong id="length-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">effect 看到的 list[2]</span>
            <strong id="third-item" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">list[2] effect 次数</span>
            <strong id="third-item-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">Object.keys(list)</span>
            <strong id="array-keys" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">keys effect 次数</span>
            <strong id="keys-runs" class="metric-value">0</strong>
          </div>
        </div>

        <div class="actions">
          <button id="push-item" type="button">push 新元素</button>
          <button id="set-far-index" type="button">写入 list[6]</button>
          <button id="shrink-length" type="button">length 缩短为 2</button>
          <button id="update-first" class="secondary" type="button">修改 list[0]</button>
        </div>

        <ol class="steps">
          <li>起点实现中，push 或写入远端索引后，数组本身已变长，但 length effect 仍显示旧值。</li>
          <li>把 length 缩短为 2 后，list[2] 已被删除，但依赖 list[2] 的 effect 仍保留旧结果。</li>
          <li>缩短 length 也删除了若干数组键，因此 Object.keys 的 effect 同样需要更新。</li>
          <li>修改已有 list[0] 不改变数组长度，不应让 length effect 重新执行。</li>
        </ol>
      </section>
    </main>
  `

  const lengthElement = container.querySelector<HTMLElement>('#array-length')!
  const lengthRunsElement = container.querySelector<HTMLElement>('#length-runs')!
  const thirdItemElement = container.querySelector<HTMLElement>('#third-item')!
  const thirdItemRunsElement = container.querySelector<HTMLElement>('#third-item-runs')!
  const keysElement = container.querySelector<HTMLElement>('#array-keys')!
  const keysRunsElement = container.querySelector<HTMLElement>('#keys-runs')!

  effect(() => {
    lengthRuns++
    lengthElement.textContent = String(list.length)
    lengthRunsElement.textContent = String(lengthRuns)
  })

  effect(() => {
    thirdItemRuns++
    thirdItemElement.textContent = list[2] ?? '(empty)'
    thirdItemRunsElement.textContent = String(thirdItemRuns)
  })

  effect(() => {
    keysRuns++
    keysElement.textContent = Object.keys(list).join(', ') || '(empty)'
    keysRunsElement.textContent = String(keysRuns)
  })

  container.querySelector<HTMLButtonElement>('#push-item')!.addEventListener('click', () => {
    list.push(String.fromCharCode(65 + list.length))
  })

  container.querySelector<HTMLButtonElement>('#set-far-index')!.addEventListener('click', () => {
    list[6] = 'G'
  })

  container.querySelector<HTMLButtonElement>('#shrink-length')!.addEventListener('click', () => {
    list.length = 2
  })

  container.querySelector<HTMLButtonElement>('#update-first')!.addEventListener('click', () => {
    list[0] = list[0] === 'A' ? 'Z' : 'A'
  })
}
