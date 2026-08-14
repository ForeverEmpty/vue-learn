export function renderHomePage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <header class="hero-header">
        <p class="eyebrow">MINI VUE PLAYGROUND</p>
        <h1>学习实验目录</h1>
        <p class="lead">选择章节进入对应测试页。每个页面只演示一个核心问题，方便对照源码和测试。</p>
      </header>

      <nav class="lesson-grid" aria-label="学习章节">
        <a class="lesson-card" href="#/chapter-1">
          <span class="chapter-number">01</span>
          <span class="status complete">已完成</span>
          <h2>ref 与 effect</h2>
          <p>验证读取时收集依赖、修改时触发 effect 的最小响应式闭环。</p>
          <span class="enter-link">进入测试页 →</span>
        </a>

        <a class="lesson-card" href="#/chapter-2">
          <span class="chapter-number">02</span>
          <span class="status learning">学习中</span>
          <h2>effect 依赖清理</h2>
          <p>观察条件分支切换后，新依赖未收集、旧依赖未删除的问题。</p>
          <span class="enter-link">进入测试页 →</span>
        </a>
      </nav>
    </main>
  `
}
