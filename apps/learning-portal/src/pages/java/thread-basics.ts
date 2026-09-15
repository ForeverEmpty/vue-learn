import { renderCourseLayout } from "../course-layout";

export function renderJavaThreadBasicsPage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "java",
    content: `
      <a class="back-link" href="#/java">← 返回 Java 学习区</a>

      <section class="test-card java-panel">
        <p class="eyebrow java-eyebrow">JAVA · CHAPTER 01 · 已完成</p>
        <h1>线程创建与生命周期</h1>
        <p class="lead">你已经完成线程创建、start 与 run 的区别，以及使用 join 等待线程结束。</p>

        <div class="status-panel success-status">
          完成状态：章节测试 2 / 2。网页记录学习结果；实际编译和执行仍由本机 JDK 完成。
        </div>

        <div class="metric-grid">
          <div class="metric"><span class="result-label">运行环境</span><strong class="metric-value small-value">Java 21</strong></div>
          <div class="metric"><span class="result-label">章节测试</span><strong class="metric-value small-value">2 / 2</strong></div>
        </div>

        <h2>章节资料</h2>
        <ul class="resource-list">
          <li><code>courses/java/docs/01-concurrency/01-thread-creation-and-lifecycle.md</code></li>
          <li><code>courses/java/src/main/java/study/concurrency/ThreadBasics.java</code></li>
        </ul>

        <h2>复现结果</h2>
        <pre class="command-block"><code>npm run java:compile
npm run java:test:chapter-01
npm run java:run</code></pre>
      </section>
    `,
  });
}
