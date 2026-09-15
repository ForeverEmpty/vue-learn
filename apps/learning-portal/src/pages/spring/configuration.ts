import { renderCourseLayout } from "../course-layout";

export function renderSpringConfigurationPage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "spring",
    content: `
      <a class="back-link" href="#/spring">← 返回 Spring Boot 学习区</a>

      <section class="test-card spring-panel">
        <p class="eyebrow spring-eyebrow">SPRING · CHAPTER 02 · 已完成</p>
        <h1>外部化配置、类型安全绑定与 Profile</h1>
        <p class="lead">本章会把课程计划配置从字符串键推进为不可变的 StudyPlanProperties，再让 Service、Controller 和 local Profile 依次接入。重点是理解配置边界，而不是背测试框架。</p>

        <div class="status-panel success-status">
          完成状态：6 个检查点、本章 9 / 9、Spring 全量 16 / 16、四级配置覆盖实践与复习题均已完成。
        </div>

        <div class="metric-grid">
          <div class="metric"><span class="result-label">完成检查点</span><strong class="metric-value small-value">6 / 6</strong></div>
          <div class="metric"><span class="result-label">章节测试</span><strong class="metric-value small-value">9 / 9</strong></div>
          <div class="metric"><span class="result-label">Spring 全量</span><strong class="metric-value small-value">16 / 16</strong></div>
        </div>

        <h2>本章路线</h2>
        <ol class="checkpoint-list">
          <li class="checkpoint-item"><strong>1</strong><span><b>配置对象的不变量</b><br>在 record 紧凑构造器中拒绝非法配置。</span><small>已完成 · 3/9</small></li>
          <li class="checkpoint-item"><strong>2</strong><span><b>类型安全配置绑定</b><br>让 Spring 把属性绑定到 StudyPlanProperties。</span><small>已完成 · 4/9</small></li>
          <li class="checkpoint-item"><strong>3</strong><span><b>业务服务</b><br>通过构造器注入配置，并生成 StudyPlan。</span><small>已完成 · 5/9</small></li>
          <li class="checkpoint-item"><strong>4</strong><span><b>HTTP Controller</b><br>把学习计划暴露为 REST API。</span><small>已完成 · 8/9</small></li>
          <li class="checkpoint-item"><strong>5</strong><span><b>local Profile</b><br>用环境专属文件覆盖默认配置。</span><small>已完成 · 9/9</small></li>
          <li class="checkpoint-item"><strong>6</strong><span><b>配置优先级</b><br>比较文件、环境变量和命令行参数的覆盖顺序。</span><small>已完成</small></li>
        </ol>

        <h2>检查点六回顾：配置覆盖优先级</h2>
        <p class="lead">你已经用同一个 jar 完成四次启动，只改变应用外部输入，验证了最终绑定值会随属性来源的优先级变化。</p>

        <h2>先打包并准备请求</h2>
        <pre class="command-block"><code>cd courses/spring
.\mvnw.cmd package</code></pre>

        <p class="lead">以下四次启动都使用 <code>target/spring-course-0.0.1-SNAPSHOT.jar</code>。请求命令保持不变：</p>
        <pre class="command-block"><code>Invoke-RestMethod http://localhost:8080/api/study-plans/spring-boot</code></pre>

        <h2>四次启动与预期</h2>
        <ol class="steps">
          <li><code>java -jar target/spring-course-0.0.1-SNAPSHOT.jar</code><br>预期 <code>dailyMinutes=30</code>、<code>estimatedDays=2</code>。</li>
          <li><code>java -jar target/spring-course-0.0.1-SNAPSHOT.jar --spring.profiles.active=local</code><br>预期 <code>dailyMinutes=60</code>、<code>estimatedDays=1</code>、<code>remindersEnabled=true</code>。</li>
          <li>先设置 <code>$env:STUDY_PLAN_DAILYMINUTES = "20"</code>，再按 local 方式启动。<br>预期 <code>dailyMinutes=20</code>、<code>estimatedDays=3</code>。</li>
          <li>保持环境变量，再追加 <code>--study.plan.daily-minutes=15</code> 启动。<br>预期 <code>dailyMinutes=15</code>、<code>estimatedDays=3</code>。</li>
        </ol>

        <p class="hint warning-hint">验证结束后执行 <code>Remove-Item Env:STUDY_PLAN_DAILYMINUTES</code>，避免临时环境变量影响当前终端后续启动。</p>

        <h2>运行检查</h2>
        <pre class="command-block"><code>npm run spring:compile
npm run spring:test:chapter-02</code></pre>

        <h2>本检查点资料</h2>
        <ul class="resource-list">
          <li><code>courses/spring/docs/01-spring-boot/02-externalized-configuration-binding-and-profiles.md</code></li>
          <li><code>courses/spring/docs/00-foundation/09-environment-property-sources-and-precedence.md</code></li>
          <li><code>courses/spring/docs/00-foundation/10-profiles-and-profile-specific-configuration.md</code></li>
          <li><code>courses/spring/docs/00-foundation/12-data-variation-behavior-variation-and-conditional-beans.md</code></li>
        </ul>

        <h2>完成本章后开放的接口</h2>
        <p class="lead">每次启动后也可以直接用这个入口观察当前应用真正返回的配置结果。</p>
        <div class="endpoint-grid">
          <a class="endpoint-link" href="http://localhost:8080/api/study-plans/spring-boot" target="_blank" rel="noreferrer">
            <strong>查询 Spring Boot 学习计划</strong>
            <code>GET /api/study-plans/spring-boot</code>
            <small>当前已可用 · 需先启动后端</small>
          </a>
        </div>
      </section>
    `,
  });
}
