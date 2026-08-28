export function renderJavaThreadBasicsPage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/java">← 返回 Java 学习区</a>

      <section class="test-card java-panel">
        <p class="eyebrow java-eyebrow">JAVA · CHAPTER 01</p>
        <h1>线程创建与生命周期</h1>
        <p class="lead">这一页负责告诉你文件和命令在哪里。Java 代码由 JDK 在终端中真实编译运行，浏览器不会伪造 Java 执行结果。</p>

        <div class="status-panel warning-status">
          起点状态：Java 源码可以编译；两个学习测试会按预期失败，等待你完成 ThreadBasics 的两个方法。
        </div>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">JDK</span>
            <strong class="metric-value small-value">Java 21</strong>
          </div>
          <div class="metric">
            <span class="result-label">起点测试</span>
            <strong class="metric-value small-value">0 / 2</strong>
          </div>
        </div>

        <h2>先阅读</h2>
        <ol class="steps">
          <li><code>courses/java/docs/00-foundation-review.md</code>：快速复习本章会用到的 Java 语法。</li>
          <li><code>courses/java/docs/01-thread-creation-and-lifecycle.md</code>：第一章完整教学和检查点。</li>
        </ol>

        <h2>再运行</h2>
        <pre class="command-block"><code>npm run java:compile
npm run java:test
npm run java:run</code></pre>

        <h2>你要修改的文件</h2>
        <p class="lead"><code>courses/java/src/main/java/study/concurrency/ThreadBasics.java</code></p>

        <p class="hint warning-hint">先不要一次写完两个方法。完成检查点一后告诉我实际输出，我会从第一个失败开始带你分析。</p>
      </section>
    </main>
  `
}
