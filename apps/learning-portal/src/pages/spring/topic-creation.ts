import { renderCourseLayout } from "../course-layout";

export function renderSpringTopicCreationPage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "spring",
    content: `
      <a class="back-link" href="#/spring">← 返回 Spring Boot 学习区</a>

      <section class="test-card spring-panel">
        <p class="eyebrow spring-eyebrow">SPRING · CHAPTER 03 · 已完成</p>
        <h1>REST 写操作、请求校验与一致错误响应</h1>
        <p class="lead">这一章不只添加一个 POST：你会让 JSON 经过请求 DTO、声明式校验、业务唯一性、状态写入和统一异常翻译，最终形成完整的创建资源链路。</p>

        <div class="status-panel warning-status">
          完成状态：六个检查点、本章 10 / 10、Spring 全量 26 / 26、真实 HTTP 写入闭环和复习题批改均已完成。
        </div>

        <div class="metric-grid">
          <div class="metric"><span class="result-label">已完成检查点</span><strong class="metric-value small-value">6 / 6</strong></div>
          <div class="metric"><span class="result-label">章节验收</span><strong class="metric-value small-value">10 / 10</strong></div>
          <div class="metric"><span class="result-label">Spring 全量</span><strong class="metric-value small-value">26 / 26</strong></div>
        </div>

        <h2>本章递进路线</h2>
        <ol class="checkpoint-list">
          <li class="checkpoint-item"><strong>1</strong><span><b>请求 DTO 约束</b><br>声明 slug、标题与时长的结构规则。</span><small>已完成 · 4/10</small></li>
          <li class="checkpoint-item"><strong>2</strong><span><b>状态写入与唯一性</b><br>用 Map 保存主题并原子拒绝重复 slug。</span><small>已完成 · 6/10</small></li>
          <li class="checkpoint-item"><strong>3</strong><span><b>POST 创建接口</b><br>接收 JSON，返回 201、Location 和创建结果。</span><small>已完成 · 7/10</small></li>
          <li class="checkpoint-item"><strong>4</strong><span><b>业务冲突</b><br>把重复 slug 翻译为稳定的 409 响应。</span><small>已完成 · 8/10</small></li>
          <li class="checkpoint-item"><strong>5</strong><span><b>输入错误契约</b><br>统一字段校验失败和损坏 JSON 的 400 响应。</span><small>已完成 · 10/10</small></li>
          <li class="checkpoint-item"><strong>6</strong><span><b>真实写入闭环</b><br>实际观察创建、查询、重复和无效输入。</span><small>已完成</small></li>
        </ol>

        <h2>本章复习题与批改</h2>
        <p class="lead">五道题已通过批改。DTO 边界和原子写入直接通过；校验触发与 Location 的职责已完成修正复核；重复记忆题已完成出题复盘。</p>
        <p class="resource-path"><code>courses/spring/review_questions/01-spring-boot/03-rest-write-validation-and-consistent-errors.md</code></p>

        <ol class="steps">
          <li><code>CreateTopicRequest</code> 与 <code>StudyTopic</code> 字段相同，为什么仍要分成两个类型？</li>
          <li>record 上的约束注解与 Controller 参数上的 <code>@Valid</code> 分别负责什么？</li>
          <li>为什么使用 <code>ConcurrentHashMap.putIfAbsent</code>，而不是 <code>containsKey</code> 后再 <code>put</code>？</li>
          <li>创建成功为什么返回 <code>201 Created</code> 和 <code>Location</code>？</li>
          <li>损坏 JSON、字段约束失败和重复 slug 分别对应什么状态与 code？为什么由 <code>@RestControllerAdvice</code> 集中翻译？</li>
        </ol>

        <p class="hint">出题反馈已纳入所有课程：后续避免重复记忆题；理论题不合适时改用适量编程题或混合题，并控制实现范围。</p>

        <h2>本章最终 HTTP 目标</h2>
        <pre class="command-block"><code>POST /api/topics             → 201 Created
GET  /api/topics/{slug}      → 200 OK
重复 slug                    → 409 Conflict
字段无效或 JSON 损坏         → 400 Bad Request</code></pre>
      </section>
    `,
  });
}
