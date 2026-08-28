import { effect, ref } from 'mini-vue'

export function renderEffectStackPage(container: HTMLElement): void {
  const outerBefore = ref(0)
  const innerValue = ref(0)
  const outerAfter = ref(0)
  const unrelated = ref(0)
  let outerRuns = 0
  let innerRuns = 0
  let innerInitialized = false

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 03</p>
        <h1>effect 栈与异常恢复</h1>
        <p class="lead">观察内层 effect 和异常如何破坏单一 activeEffect，以及正确恢复状态的重要性。</p>

        <section class="experiment">
          <h2>实验一：嵌套 effect</h2>
          <div class="metric-grid">
            <div class="metric">
              <span class="result-label">外层执行次数</span>
              <strong id="outer-runs" class="metric-value">0</strong>
            </div>
            <div class="metric">
              <span class="result-label">内层执行次数</span>
              <strong id="inner-runs" class="metric-value">0</strong>
            </div>
          </div>
          <button id="update-outer-after" type="button">修改外层尾部 ref</button>
          <p class="hint warning-hint">
            当前点击后外层次数不会增加，因为内层 effect 结束时把 activeEffect 直接清空，外层尾部 ref 没有收集到外层 effect。
          </p>
        </section>

        <section class="experiment">
          <h2>实验二：异常恢复</h2>
          <div id="error-status" class="status-panel">尚未运行异常实验</div>
          <div class="actions">
            <button id="run-error-effect" type="button">运行异常 effect</button>
            <button id="update-unrelated" class="secondary" type="button">修改无关 ref</button>
          </div>
          <ol class="steps">
            <li>先运行异常 effect，错误会在页面代码中被捕获。</li>
            <li>再修改无关 ref。当前实现会错误触发刚才失败的 effect。</li>
            <li>本章完成后，无关 ref 不应触发任何异常。</li>
          </ol>
        </section>
      </section>
    </main>
  `

  const outerRunsElement = container.querySelector<HTMLElement>('#outer-runs')!
  const innerRunsElement = container.querySelector<HTMLElement>('#inner-runs')!
  const updateOuterAfterButton = container.querySelector<HTMLButtonElement>('#update-outer-after')!
  const runErrorEffectButton = container.querySelector<HTMLButtonElement>('#run-error-effect')!
  const updateUnrelatedButton = container.querySelector<HTMLButtonElement>('#update-unrelated')!
  const errorStatus = container.querySelector<HTMLElement>('#error-status')!

  effect(() => {
    outerRuns++
    outerBefore.value

    if (!innerInitialized) {
      innerInitialized = true
      effect(() => {
        innerRuns++
        innerValue.value
        innerRunsElement.textContent = String(innerRuns)
      })
    }

    outerAfter.value
    outerRunsElement.textContent = String(outerRuns)
  })

  updateOuterAfterButton.addEventListener('click', () => {
    outerAfter.value++
  })

  runErrorEffectButton.addEventListener('click', () => {
    try {
      effect(() => {
        throw new Error('playground effect error')
      })
    } catch {
      errorStatus.textContent = '异常已被页面捕获；现在请修改无关 ref'
      errorStatus.className = 'status-panel warning-status'
    }

    unrelated.value
  })

  updateUnrelatedButton.addEventListener('click', () => {
    try {
      unrelated.value++
      errorStatus.textContent = '无关 ref 修改成功，没有触发失败的 effect'
      errorStatus.className = 'status-panel success-status'
    } catch {
      errorStatus.textContent = '无关 ref 错误触发了失败的 effect：activeEffect 仍被污染'
      errorStatus.className = 'status-panel error-status'
    }
  })
}
