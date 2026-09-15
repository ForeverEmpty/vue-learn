import { renderCourseLayout } from "../course-layout";

export function renderSpringBootstrapPage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "spring",
    content: `
      <a class="back-link" href="#/spring">← 返回 Spring Boot 学习区</a>

      <section class="test-card spring-panel">
        <p class="eyebrow spring-eyebrow">SPRING · CHAPTER 01 · 已完成</p>
        <h1>启动、IoC / DI 与第一个 HTTP API</h1>
        <p class="lead">这一章已经完成从应用入口到 HTTP 错误响应的完整调用链：Controller 接收请求，Service 负责业务查询，Advice 把领域异常翻译成 404。</p>

        <div class="status-panel success-status">
          完成状态：章节测试 7 / 7，Spring Boot 4.1.1 已在本机 8080 端口启动验证。
        </div>

        <div class="metric-grid">
          <div class="metric"><span class="result-label">运行环境</span><strong class="metric-value small-value">Spring Boot 4.1.1</strong></div>
          <div class="metric"><span class="result-label">章节测试</span><strong class="metric-value small-value">7 / 7</strong></div>
        </div>

        <h2>真实接口入口</h2>
        <p class="lead">先运行 <code>npm run spring:run</code>，再打开下面的链接。它们直接请求你的 Spring Boot 服务；服务未运行时浏览器会显示连接失败。</p>
        <div class="endpoint-grid">
          <a class="endpoint-link" href="http://localhost:8080/api/topics/spring-boot" target="_blank" rel="noreferrer">
            <strong>查询已有主题</strong>
            <code>GET /api/topics/spring-boot</code>
            <small>预期返回主题 JSON</small>
          </a>
          <a class="endpoint-link" href="http://localhost:8080/api/topics/missing" target="_blank" rel="noreferrer">
            <strong>查询不存在的主题</strong>
            <code>GET /api/topics/missing</code>
            <small>预期返回 404 错误 JSON</small>
          </a>
        </div>

        <h2>章节资料</h2>
        <ul class="resource-list">
          <li><code>courses/spring/docs/01-spring-boot/01-bootstrap-ioc-di-and-http-api.md</code></li>
          <li><code>courses/spring/src/main/java/study/spring/topic/TopicController.java</code></li>
          <li><code>courses/spring/src/main/java/study/spring/topic/TopicExceptionHandler.java</code></li>
        </ul>

        <h2>复现结果</h2>
        <pre class="command-block"><code>npm run spring:compile
npm run spring:test:chapter-01
npm run spring:run</code></pre>
      </section>
    `,
  });
}
