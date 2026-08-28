import { effect, ref } from 'mini-vue'

export function renderRefEffectPage(container: HTMLElement): void {
  const count = ref(0)

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 01</p>
        <h1>ref 与 effect</h1>
        <p class="lead">点击按钮修改 count.value，effect 应该自动重新执行并更新页面。</p>

        <div class="result-panel">
          <span class="result-label">页面显示值</span>
          <strong id="count" class="result-value"></strong>
        </div>

        <button id="increment" type="button">count + 1</button>

        <p class="hint success-hint">
          正确结果：每次点击后，页面数字依次变为 1、2、3。第一章实现已经满足该行为。
        </p>
      </section>
    </main>
  `

  const countElement = container.querySelector<HTMLElement>('#count')!
  const incrementButton = container.querySelector<HTMLButtonElement>('#increment')!

  effect(() => {
    countElement.textContent = String(count.value)
  })

  incrementButton.addEventListener('click', () => {
    count.value++
  })
}
