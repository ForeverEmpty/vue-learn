import { renderCourseLayout } from "../course-layout";

export function renderJavaHomePage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "java",
    content: `
      <header class="course-hero java-hero">
        <div class="course-hero-meta">
          <p class="eyebrow java-eyebrow">JAVA 21 · CONCURRENCY</p>
          <span class="course-badge java-badge">前三章完成</span>
        </div>
        <h1>Java 并发学习路径</h1>
        <p class="lead">从线程创建逐步进入共享状态与线程协作。所有示例都由本机 JDK 21 真实编译和运行，不依赖 Maven、Gradle 或 JUnit。</p>
        <div class="course-summary java-summary" aria-label="Java 学习进度">
          <div><strong>3</strong><span>已完成章节</span></div>
          <div><strong>12 / 12</strong><span>章节测试</span></div>
          <div><strong>15</strong><span>基础知识主题</span></div>
        </div>
      </header>

      <section class="lesson-section">
        <div class="section-heading java-section-heading">
          <div>
            <p class="eyebrow java-eyebrow">FOUNDATION 00</p>
            <h2>按需查询的 Java 基础</h2>
          </div>
          <p>不设复习题</p>
        </div>

        <div class="test-card compact-card java-panel">
          <p class="lead">包含函数式接口、异常与中断、泛型、并发集合、AtomicReference、注解、record、Optional、Stream、正则表达式等独立主题。</p>
          <p class="resource-path"><code>courses/java/docs/00-foundation/README.md</code></p>
        </div>
      </section>

      <section class="lesson-section">
        <div class="section-heading java-section-heading">
          <div>
            <p class="eyebrow java-eyebrow">CONCURRENCY</p>
            <h2>多线程主课程</h2>
          </div>
          <p>3 章全部完成</p>
        </div>

        <nav class="lesson-grid foundation-grid" aria-label="Java 多线程章节">
          <a class="lesson-card java-card" href="#/java/chapter-1">
            <span class="chapter-number">JAVA · CHAPTER 01</span>
            <span class="status complete">2 / 2</span>
            <h2>线程创建与生命周期</h2>
            <p>区分 Runnable、Thread、run 和 start，并使用 join 等待工作线程结束。</p>
            <span class="enter-link">查看章节 →</span>
          </a>

          <a class="lesson-card java-card" href="#/java/chapter-2">
            <span class="chapter-number">JAVA · CHAPTER 02</span>
            <span class="status complete">3 / 3</span>
            <h2>共享状态、竞态与 synchronized</h2>
            <p>从丢失更新出发，理解临界区、互斥和对象锁如何保护共享状态。</p>
            <span class="enter-link">查看章节 →</span>
          </a>

          <a class="lesson-card java-card" href="#/java/chapter-3">
            <span class="chapter-number">JAVA · CHAPTER 03</span>
            <span class="status complete">7 / 7</span>
            <h2>wait、notifyAll 与有界缓冲区</h2>
            <p>用条件等待实现生产者—消费者协作，并处理虚假唤醒、关闭和中断。</p>
            <span class="enter-link">查看章节 →</span>
          </a>
        </nav>
      </section>
    `,
  });
}
