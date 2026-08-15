import { effect, reactive } from 'mini-vue'

export function renderDeepReactivePage(container: HTMLElement): void {
  const raw = {
    profile: {
      name: 'Ada',
    },
  }
  const state = reactive(raw)
  let runs = 0
  let revision = 0

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 05</p>
        <h1>深层 reactive 与 Proxy 缓存</h1>
        <p class="lead">读取嵌套对象时惰性创建 Proxy，并让同一个原对象始终复用同一个代理。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">profile.name</span>
            <strong id="profile-name" class="metric-value small-value"></strong>
          </div>
          <div class="metric">
            <span class="result-label">effect 执行次数</span>
            <strong id="effect-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">嵌套对象是否仍为 raw</span>
            <strong id="is-raw" class="metric-value small-value"></strong>
          </div>
          <div class="metric">
            <span class="result-label">两次读取身份是否相同</span>
            <strong id="stable-identity" class="metric-value small-value"></strong>
          </div>
        </div>

        <button id="update-name" type="button">修改嵌套 name</button>

        <ol class="steps">
          <li>当前浅层实现中，profile 仍是 raw 对象，修改 name 不会更新页面。</li>
          <li>加入深层转换后，profile 不再等于 raw.profile，嵌套修改能够触发 effect。</li>
          <li>加入缓存后，两次读取 state.profile 必须返回同一个 Proxy。</li>
        </ol>
      </section>
    </main>
  `

  const profileName = container.querySelector<HTMLElement>('#profile-name')!
  const effectRuns = container.querySelector<HTMLElement>('#effect-runs')!
  const isRaw = container.querySelector<HTMLElement>('#is-raw')!
  const stableIdentity = container.querySelector<HTMLElement>('#stable-identity')!
  const updateNameButton = container.querySelector<HTMLButtonElement>('#update-name')!

  const firstProfile = state.profile
  const secondProfile = state.profile
  isRaw.textContent = firstProfile === raw.profile ? '是' : '否'
  stableIdentity.textContent = firstProfile === secondProfile ? '是' : '否'

  effect(() => {
    runs++
    profileName.textContent = state.profile.name
    effectRuns.textContent = String(runs)
  })

  updateNameButton.addEventListener('click', () => {
    revision++
    state.profile.name = `Profile ${revision}`
  })
}
