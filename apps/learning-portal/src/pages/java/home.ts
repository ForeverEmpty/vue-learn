import { renderCourseLayout } from "../course-layout";

export function renderJavaHomePage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "java",
    content: `
      <header class="course-hero java-hero">
        <div class="course-hero-meta">
          <p class="eyebrow java-eyebrow">SECONDARY · JAVA 21</p>
          <span class="course-badge java-badge">独立支线</span>
        </div>
        <h1>Java 并发学习路径</h1>
        <p class="lead">基础语法只做快速复习，正式教学从多线程开始。源码和测试使用本机 JDK 21，不依赖 Maven、Gradle 或 JUnit。</p>
        <div class="course-summary java-summary" aria-label="Java 学习进度">
          <div><strong>21</strong><span>JDK 版本</span></div>
          <div><strong>01</strong><span>当前章节</span></div>
          <div><strong>待开始</strong><span>多线程主线</span></div>
        </div>
      </header>

      <section class="lesson-section">
        <div class="section-heading java-section-heading">
          <div>
            <p class="eyebrow java-eyebrow">FOUNDATION 00</p>
            <h2>必要基础复习</h2>
          </div>
          <p>阅读型，不单独占用主章节</p>
        </div>

        <div class="test-card compact-card java-panel">
          <p class="lead">复习 class、static、main、Runnable、lambda、方法引用和 InterruptedException。</p>
          <p class="resource-path"><code>courses/java/docs/00-foundation-review.md</code></p>
        </div>
      </section>

      <section class="lesson-section">
        <div class="section-heading java-section-heading">
          <div>
            <p class="eyebrow java-eyebrow">CONCURRENCY</p>
            <h2>多线程主课程</h2>
          </div>
          <p>当前章节</p>
        </div>

        <nav class="lesson-grid foundation-grid" aria-label="Java 多线程章节">
          <a class="lesson-card java-card" href="#/java/chapter-1">
            <span class="chapter-number">JAVA · CHAPTER 01</span>
            <span class="status learning">待开始</span>
            <h2>线程创建与生命周期</h2>
            <p>区分 Runnable、Thread、run 和 start，并使用 join 等待工作线程结束。</p>
            <span class="enter-link">进入章节说明 →</span>
          </a>
        </nav>
      </section>
    `,
  });
}
