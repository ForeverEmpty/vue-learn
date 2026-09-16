import { renderCourseLayout } from "../course-layout";

export function renderJavaHomePage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "java",
    content: `
      <header class="course-hero java-hero">
        <div class="course-hero-meta">
          <p class="eyebrow java-eyebrow">JAVA 21 · CORE MECHANISMS & ADVANCED APPLICATIONS</p>
          <span class="course-badge java-badge">并发模块已完成</span>
        </div>
        <h1>Java 核心机制与高级应用</h1>
        <p class="lead">并发只是第一个模块。课程将继续进入反射、运行时注解、动态代理、泛型类型系统、现代并发、I/O/NIO、JVM、SPI 与模块化，并用可以运行的综合项目串联机制。</p>
        <div class="course-summary java-summary" aria-label="Java 学习进度">
          <div><strong>3</strong><span>已完成章节</span></div>
          <div><strong>7</strong><span>正式模块路线</span></div>
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
            <p class="eyebrow java-eyebrow">MODULE 01 · CONCURRENCY</p>
            <h2>线程、共享状态与协作</h2>
          </div>
          <p>3 章全部完成</p>
        </div>

        <nav class="lesson-grid foundation-grid" aria-label="Java 并发模块章节">
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

      <section class="lesson-section">
        <div class="section-heading java-section-heading">
          <div>
            <p class="eyebrow java-eyebrow">ADVANCED ROADMAP</p>
            <h2>后续高级模块</h2>
          </div>
          <p>按机制依赖递进</p>
        </div>

        <div class="lesson-grid foundation-grid" aria-label="Java 后续高级模块">
          <article class="lesson-card java-card">
            <span class="chapter-number">MODULE 02</span>
            <span class="status learning">下一模块</span>
            <h2>反射、注解元数据与动态代理</h2>
            <p>从 Class 与成员访问逐步构建运行时注解读取、代理调用链和纯 Java 迷你对象容器。</p>
            <span class="resource-path"><code>docs/02-reflection-and-metaprogramming/</code></span>
          </article>

          <article class="lesson-card java-card">
            <span class="chapter-number">MODULE 03</span>
            <span class="status">规划中</span>
            <h2>泛型类型系统与可复用 API</h2>
            <p>掌握边界、通配符、类型擦除与运行时 Type，并构建类型安全注册表。</p>
          </article>

          <article class="lesson-card java-card">
            <span class="chapter-number">MODULE 04</span>
            <span class="status">规划中</span>
            <h2>现代并发与异步编排</h2>
            <p>继续学习 JMM、volatile、CAS、Lock、线程池、Future 和并发集合。</p>
          </article>

          <article class="lesson-card java-card">
            <span class="chapter-number">MODULE 05</span>
            <span class="status">规划中</span>
            <h2>I/O、NIO 与网络编程</h2>
            <p>组合文件系统、流、Channel、Buffer、字符编码和基础 Socket。</p>
          </article>

          <article class="lesson-card java-card">
            <span class="chapter-number">MODULE 06</span>
            <span class="status">规划中</span>
            <h2>JVM、类加载与诊断</h2>
            <p>理解类加载器、运行时内存、GC、字节码、JIT 与问题诊断。</p>
          </article>

          <article class="lesson-card java-card">
            <span class="chapter-number">MODULE 07</span>
            <span class="status">规划中</span>
            <h2>扩展机制与工程集成</h2>
            <p>使用 ServiceLoader、SPI、JPMS、JDBC 与插件化边界组合完整应用。</p>
          </article>
        </div>
      </section>
    `,
  });
}
