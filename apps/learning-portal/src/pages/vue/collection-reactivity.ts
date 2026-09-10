export function renderCollectionReactivityPage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 20</p>
        <h1>Map/Set 集合响应式</h1>
        <p class="lead">本章已开启。先从集合代理为什么需要专用处理器开始，再实现键、size、迭代器和变更触发。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">章节状态</span>
            <strong class="metric-value small-value">学习中</strong>
          </div>
          <div class="metric">
            <span class="result-label">目标集合</span>
            <strong class="metric-value small-value">Map · Set</strong>
          </div>
          <div class="metric">
            <span class="result-label">响应式模块</span>
            <strong class="metric-value small-value">最后一章</strong>
          </div>
        </div>

        <p class="status-panel warning-status">当前还没有实现检查点。请先阅读章节文档，再为 Map/Set 建立独立测试。</p>

        <ol class="steps">
          <li>先解释集合方法为什么不能直接使用普通对象代理。</li>
          <li>再实现 get、has、size 和迭代器的依赖收集。</li>
          <li>最后区分新增、更新、删除与清空的触发边界。</li>
        </ol>

        <div class="actions">
          <a class="button" href="#/">返回章节目录</a>
        </div>
      </section>
    </main>
  `;
}
