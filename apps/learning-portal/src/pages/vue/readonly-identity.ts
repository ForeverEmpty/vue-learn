import { isProxy, isReactive, isReadonly, reactive, readonly, toRaw } from 'mini-vue'

export function renderReadonlyIdentityPage(container: HTMLElement): void {
  const raw = {
    count: 1,
    profile: {
      name: 'Ada',
    },
  }
  const state = reactive(raw)
  const view = readonly(raw)

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 13</p>
        <h1>readonly 与代理身份工具</h1>
        <p class="lead">观察透明 Proxy 为什么仍能写入原对象，再逐步加入身份标记、深层只读、写入拦截和 Proxy 缓存。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">raw.count</span>
            <strong id="raw-count" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">view.count</span>
            <strong id="view-count" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isReactive(state)</span>
            <strong id="reactive-identity" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isReadonly(view)</span>
            <strong id="readonly-identity" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isReadonly(view.profile)</span>
            <strong id="nested-identity" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isProxy(view)</span>
            <strong id="proxy-identity" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">toRaw(view) === raw</span>
            <strong id="raw-identity" class="metric-value small-value">-</strong>
          </div>
        </div>

        <div class="actions">
          <button id="readonly-set" type="button">通过 readonly 写入</button>
          <button id="readonly-delete" type="button">通过 readonly 删除</button>
          <button id="reactive-set" class="secondary" type="button">通过 reactive 写入</button>
        </div>

        <p id="operation-status" class="status-panel">尚未执行修改操作。</p>

        <ol class="steps">
          <li>起点的 readonly handler 为空，因此读取能够转发，写入和删除也会错误地转发。</li>
          <li>身份查询应读取内部 Symbol，并在普通依赖收集之前直接返回。</li>
          <li>完成后，readonly 操作只警告而不改变 raw；reactive 操作仍然可以修改 raw。</li>
          <li>嵌套对象需要在读取时惰性转换，不能只保护根对象。</li>
        </ol>
      </section>
    </main>
  `

  const rawCountElement = container.querySelector<HTMLElement>('#raw-count')!
  const viewCountElement = container.querySelector<HTMLElement>('#view-count')!
  const reactiveIdentityElement = container.querySelector<HTMLElement>('#reactive-identity')!
  const readonlyIdentityElement = container.querySelector<HTMLElement>('#readonly-identity')!
  const nestedIdentityElement = container.querySelector<HTMLElement>('#nested-identity')!
  const proxyIdentityElement = container.querySelector<HTMLElement>('#proxy-identity')!
  const rawIdentityElement = container.querySelector<HTMLElement>('#raw-identity')!
  const operationStatusElement = container.querySelector<HTMLElement>('#operation-status')!

  function readCount(target: object): unknown {
    return Reflect.get(target, 'count')
  }

  function updateMetrics(): void {
    rawCountElement.textContent = String(readCount(raw) ?? '已删除')
    viewCountElement.textContent = String(readCount(view) ?? '已删除')
    reactiveIdentityElement.textContent = String(isReactive(state))
    readonlyIdentityElement.textContent = String(isReadonly(view))
    nestedIdentityElement.textContent = String(isReadonly(view.profile))
    proxyIdentityElement.textContent = String(isProxy(view))
    rawIdentityElement.textContent = String(toRaw(view) === raw)
  }

  container.querySelector<HTMLButtonElement>('#readonly-set')!.addEventListener('click', () => {
    const before = readCount(raw)
    const didSet = Reflect.set(view, 'count', Number(before ?? 0) + 1)
    const wasBlocked = Object.is(readCount(raw), before)

    operationStatusElement.textContent = `readonly 写入返回 ${String(didSet)}；原对象${wasBlocked ? '没有变化' : '发生了变化'}`
    operationStatusElement.className = `status-panel ${wasBlocked ? 'success-status' : 'warning-status'}`
    updateMetrics()
  })

  container.querySelector<HTMLButtonElement>('#readonly-delete')!.addEventListener('click', () => {
    const hadCount = Reflect.has(raw, 'count')
    const didDelete = Reflect.deleteProperty(view, 'count')
    const wasBlocked = !hadCount || Reflect.has(raw, 'count')

    operationStatusElement.textContent = `readonly 删除返回 ${String(didDelete)}；原属性${wasBlocked ? '仍然存在' : '已被删除'}`
    operationStatusElement.className = `status-panel ${wasBlocked ? 'success-status' : 'warning-status'}`
    updateMetrics()
  })

  container.querySelector<HTMLButtonElement>('#reactive-set')!.addEventListener('click', () => {
    const currentCount = Number(readCount(raw) ?? 0)
    Reflect.set(state, 'count', currentCount + 1)
    operationStatusElement.textContent = 'reactive 写入成功；readonly 只限制自己的访问路径。'
    operationStatusElement.className = 'status-panel success-status'
    updateMetrics()
  })

  updateMetrics()
}
