export type CourseLanguage = "vue" | "java" | "spring";

type CourseLayoutOptions = {
  activeLanguage: CourseLanguage;
  content: string;
};

type ModuleItem = {
  label: string;
  status: string;
  active?: boolean;
};

const languageModules: Record<CourseLanguage, ModuleItem[]> = {
  vue: [
    { label: "响应式", status: "当前", active: true },
    { label: "运行时", status: "后续" },
    { label: "组件与编译器", status: "规划中" },
  ],
  java: [
    { label: "基础复习", status: "辅助" },
    { label: "并发编程", status: "当前", active: true },
    { label: "JVM 与工程化", status: "规划中" },
  ],
  spring: [
    { label: "Spring 基础", status: "查询" },
    { label: "Spring Boot", status: "当前", active: true },
    { label: "数据与安全", status: "后续" },
  ],
};

const courseContext: Record<
  CourseLanguage,
  { label: string; route: string; description: string }
> = {
  vue: {
    label: "TypeScript / Vue",
    route: "Mini Vue 响应式",
    description: "响应式模块已完成，下一阶段进入运行时。",
  },
  java: {
    label: "Java 21",
    route: "Java 并发编程",
    description: "并发前三章已完成，基础知识继续按需补充。",
  },
  spring: {
    label: "Spring Boot 4",
    route: "Spring Boot 后端",
    description: "前三章已完成，下一阶段将进入数据库与事务。",
  },
};

function renderModuleTabs(activeLanguage: CourseLanguage): string {
  return languageModules[activeLanguage]
    .map(
      ({ label, status, active }) => `
        <span class="module-tab${active ? " is-active" : ""}">
          <strong>${label}</strong>
          <small>${status}</small>
        </span>
      `,
    )
    .join("");
}

export function renderCourseLayout(
  container: HTMLElement,
  { activeLanguage, content }: CourseLayoutOptions,
): void {
  const vueActive = activeLanguage === "vue";
  const javaActive = activeLanguage === "java";
  const springActive = activeLanguage === "spring";
  const context = courseContext[activeLanguage];

  container.innerHTML = `
    <div class="portal-frame language-${activeLanguage}">
      <header class="portal-topbar">
        <a class="topbar-brand" href="#/" aria-label="返回学习首页">
          <span class="portal-logo" aria-hidden="true">PS</span>
          <span>
            <strong>Programming Study</strong>
            <small>Learning workspace</small>
          </span>
        </a>

        <nav class="module-tabs" aria-label="当前语言的课程模块">
          ${renderModuleTabs(activeLanguage)}
        </nav>

        <div class="topbar-context">
          <span>当前语言</span>
          <strong>${context.label}</strong>
        </div>
      </header>

      <main class="course-layout">
        <aside class="language-sidebar">
          <div class="language-heading">
            <span>学习语言</span>
            <small>选择后在右侧查看课程</small>
          </div>

          <nav class="language-picker" aria-label="选择学习语言">
            <a
              class="language-option vue-option${vueActive ? " is-active" : ""}"
              href="#/"
              ${vueActive ? 'aria-current="page"' : ""}
            >
              <span class="language-icon">TS</span>
              <span class="language-copy">
                <strong>TypeScript / Vue</strong>
                <small>当前主课程 · 21 章完成</small>
              </span>
              <span class="language-arrow" aria-hidden="true">→</span>
            </a>

            <a
              class="language-option java-option${javaActive ? " is-active" : ""}"
              href="#/java"
              ${javaActive ? 'aria-current="page"' : ""}
            >
              <span class="language-icon">JV</span>
              <span class="language-copy">
                <strong>Java</strong>
                <small>独立支线 · 从多线程开始</small>
              </span>
              <span class="language-arrow" aria-hidden="true">→</span>
            </a>

            <a
              class="language-option spring-option${springActive ? " is-active" : ""}"
              href="#/spring"
              ${springActive ? 'aria-current="page"' : ""}
            >
              <span class="language-icon">SB</span>
              <span class="language-copy">
                <strong>Spring Boot</strong>
                <small>后端课程 · 前三章完成</small>
              </span>
              <span class="language-arrow" aria-hidden="true">→</span>
            </a>
          </nav>

          <div class="sidebar-note">
            <span>当前路线</span>
            <strong>${context.route}</strong>
            <p>${context.description}</p>
          </div>
        </aside>

        <section class="course-canvas">
          ${content}
        </section>
      </main>
    </div>
  `;
}
