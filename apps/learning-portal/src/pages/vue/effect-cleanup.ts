import { effect, ref } from 'mini-vue'

export function renderEffectCleanupPage(container: HTMLElement): void {
  const usePrimary = ref(true)
  const primaryMessage = ref('主分支 A')
  const fallbackMessage = ref('备用分支 B')
  let primaryRevision = 0
  let fallbackRevision = 0

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 02</p>
        <h1>effect 依赖清理</h1>
        <p class="lead">通过条件分支观察 effect 重新执行时的依赖变化。</p>

        <div class="result-panel">
          <span class="result-label">当前显示</span>
          <strong id="branch-output" class="result-value text-value"></strong>
        </div>

        <div class="actions">
          <button id="toggle-branch" type="button">切换主/备用分支</button>
          <button id="update-primary" class="secondary" type="button">修改主分支</button>
          <button id="update-fallback" class="secondary" type="button">修改备用分支</button>
        </div>

        <ol class="steps">
          <li>点击“切换主/备用分支”，页面会从主分支切换到备用分支。</li>
          <li>点击“修改备用分支”，当前页面不会更新：新依赖没有被收集。</li>
          <li>点击“修改主分支”，页面反而更新：旧依赖仍然存在。</li>
        </ol>

        <p class="hint warning-hint">
          第二章完成后，第 2 步应该更新页面，第 3 步不应该影响页面。
        </p>
      </section>
    </main>
  `

  const branchOutput = container.querySelector<HTMLElement>('#branch-output')!
  const toggleBranchButton = container.querySelector<HTMLButtonElement>('#toggle-branch')!
  const updatePrimaryButton = container.querySelector<HTMLButtonElement>('#update-primary')!
  const updateFallbackButton = container.querySelector<HTMLButtonElement>('#update-fallback')!

  effect(() => {
    branchOutput.textContent = usePrimary.value
      ? primaryMessage.value
      : fallbackMessage.value
  })

  toggleBranchButton.addEventListener('click', () => {
    usePrimary.value = !usePrimary.value
  })

  updatePrimaryButton.addEventListener('click', () => {
    primaryRevision++
    primaryMessage.value = `主分支 A · 修改 ${primaryRevision}`
  })

  updateFallbackButton.addEventListener('click', () => {
    fallbackRevision++
    fallbackMessage.value = `备用分支 B · 修改 ${fallbackRevision}`
  })
}
