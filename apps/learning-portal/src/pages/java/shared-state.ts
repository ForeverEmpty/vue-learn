import { renderCourseLayout } from "../course-layout";

export function renderJavaSharedStatePage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "java",
    content: `
      <a class="back-link" href="#/java">← 返回 Java 学习区</a>

      <section class="test-card java-panel">
        <p class="eyebrow java-eyebrow">JAVA · CHAPTER 02 · 已完成</p>
        <h1>共享状态、竞态与 synchronized</h1>
        <p class="lead">这一章从 value++ 的读取—修改—写回过程出发，解释丢失更新，并用 synchronized 把复合操作变成受保护的临界区。</p>

        <div class="status-panel success-status">
          完成状态：章节测试 3 / 3。你已经能说明为什么两个线程都读到 10 时，最终结果可能只有 11。
        </div>

        <div class="metric-grid">
          <div class="metric"><span class="result-label">核心机制</span><strong class="metric-value small-value">synchronized</strong></div>
          <div class="metric"><span class="result-label">章节测试</span><strong class="metric-value small-value">3 / 3</strong></div>
        </div>

        <h2>章节资料</h2>
        <ul class="resource-list">
          <li><code>courses/java/docs/01-concurrency/02-shared-state-race-and-synchronized.md</code></li>
          <li><code>courses/java/src/main/java/study/concurrency/SharedCounter.java</code></li>
        </ul>

        <h2>复现结果</h2>
        <pre class="command-block"><code>npm run java:compile
npm run java:test:chapter-02
npm run java:run</code></pre>
      </section>
    `,
  });
}
