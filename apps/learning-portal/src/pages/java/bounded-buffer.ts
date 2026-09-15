import { renderCourseLayout } from "../course-layout";

export function renderJavaBoundedBufferPage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "java",
    content: `
      <a class="back-link" href="#/java">← 返回 Java 学习区</a>

      <section class="test-card java-panel">
        <p class="eyebrow java-eyebrow">JAVA · CHAPTER 03 · 已完成</p>
        <h1>wait、notifyAll 与有界缓冲区</h1>
        <p class="lead">你已经把互斥推进到线程协作：缓冲区满时生产者等待，空时消费者等待，状态变化后唤醒所有等待者重新检查条件。</p>

        <div class="status-panel success-status">
          完成状态：章节测试 7 / 7。实现覆盖容量限制、FIFO、阻塞、关闭语义和中断传播。
        </div>

        <div class="metric-grid">
          <div class="metric"><span class="result-label">核心机制</span><strong class="metric-value small-value">wait / notifyAll</strong></div>
          <div class="metric"><span class="result-label">章节测试</span><strong class="metric-value small-value">7 / 7</strong></div>
        </div>

        <h2>章节资料</h2>
        <ul class="resource-list">
          <li><code>courses/java/docs/01-concurrency/03-wait-notify-and-bounded-buffer.md</code></li>
          <li><code>courses/java/src/main/java/study/concurrency/BoundedBuffer.java</code></li>
          <li><code>courses/java/src/main/java/study/concurrency/ProducerConsumerScenario.java</code></li>
        </ul>

        <h2>复现结果</h2>
        <pre class="command-block"><code>npm run java:compile
npm run java:test:chapter-03
npm run java:run</code></pre>
      </section>
    `,
  });
}
