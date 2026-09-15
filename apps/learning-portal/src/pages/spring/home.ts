import { renderCourseLayout } from "../course-layout";

export function renderSpringHomePage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "spring",
    content: `
      <header class="course-hero spring-hero">
        <div class="course-hero-meta">
          <p class="eyebrow spring-eyebrow">SPRING BOOT 4.1.1 · JAVA 21</p>
          <span class="course-badge spring-badge">前两章完成</span>
        </div>
        <h1>Spring Boot 后端学习路径</h1>
        <p class="lead">从应用启动、IoC 与 HTTP API 开始，逐步进入外部化配置、数据访问、安全与生产化能力。重要注解和设计思想会拆到独立基础章节。</p>
        <div class="course-summary spring-summary" aria-label="Spring Boot 学习进度">
          <div><strong>2</strong><span>已完成章节</span></div>
          <div><strong>16 / 16</strong><span>Spring 全量测试</span></div>
          <div><strong>12</strong><span>基础知识主题</span></div>
        </div>
      </header>

      <section class="lesson-section">
        <div class="section-heading spring-section-heading">
          <div>
            <p class="eyebrow spring-eyebrow">FOUNDATION 00</p>
            <h2>Spring 基础与设计思想</h2>
          </div>
          <p>随主线按需扩展</p>
        </div>

        <div class="test-card compact-card spring-panel">
          <p class="lead">集中查询常用注解、Bean、IoC / DI、HTTP 状态、异常边界、配置属性、Profile 和 fail-fast。理论内容独立成文，不挤进主章节。</p>
          <p class="resource-path"><code>courses/spring/docs/00-foundation/README.md</code></p>
        </div>
      </section>

      <section class="lesson-section">
        <div class="section-heading spring-section-heading">
          <div>
            <p class="eyebrow spring-eyebrow">SPRING BOOT</p>
            <h2>主课程</h2>
          </div>
          <p>前两章全部完成</p>
        </div>

        <nav class="lesson-grid foundation-grid" aria-label="Spring Boot 章节">
          <a class="lesson-card spring-card" href="#/spring/chapter-1">
            <span class="chapter-number">SPRING · CHAPTER 01</span>
            <span class="status complete">7 / 7</span>
            <h2>启动、IoC / DI 与 HTTP API</h2>
            <p>构建第一个 REST API，理解组件注册、构造器注入、异常翻译与 HTTP 边界。</p>
            <span class="enter-link">查看章节与接口 →</span>
          </a>

          <a class="lesson-card spring-card" href="#/spring/chapter-2">
            <span class="chapter-number">SPRING · CHAPTER 02</span>
            <span class="status complete">9 / 9</span>
            <h2>外部化配置、类型安全绑定与 Profile</h2>
            <p>把散落的配置收束为有约束的 Java 对象，并观察不同配置来源的覆盖顺序。</p>
            <span class="enter-link">回顾章节与接口 →</span>
          </a>
        </nav>
      </section>
    `,
  });
}
