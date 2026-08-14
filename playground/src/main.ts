import { effect, ref } from 'mini-vue'
import './style.css'

const count = ref(0)

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <section class="card">
    <p class="eyebrow">MINI VUE PLAYGROUND</p>
    <h1>从响应式开始</h1>
    <p>页面显示值：<strong id="count"></strong></p>
    <button id="increment" type="button">count + 1</button>
    <p class="hint">
      当前按钮会修改 count.value，但页面还不会更新。这正是第一阶段要解决的问题。
    </p>
  </section>
`

const countElement = document.querySelector<HTMLElement>('#count')!
const incrementButton = document.querySelector<HTMLButtonElement>('#increment')!

effect(() => {
  countElement.textContent = String(count.value)
})

incrementButton.addEventListener('click', () => {
  count.value++
})
