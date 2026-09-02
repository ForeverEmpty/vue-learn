import { renderCourseLayout } from "./course-layout";

export function renderHomePage(container: HTMLElement): void {
  renderCourseLayout(container, {
    activeLanguage: "vue",
    content: `
      <header class="course-hero vue-hero">
        <div class="course-hero-meta">
          <p class="eyebrow">PRIMARY · TYPESCRIPT / VUE</p>
          <span class="course-badge">主课程</span>
        </div>
        <h1>Mini Vue 学习路径</h1>
        <p class="lead">用原生 TypeScript 从响应式开始实现 Vue。每一章都配有源码检查点、自动测试、浏览器实验和复习题。</p>
        <div class="course-summary" aria-label="Vue 学习进度">
          <div><strong>16</strong><span>已完成章节</span></div>
          <div><strong>150</strong><span>通过的测试</span></div>
          <div><strong>进行中</strong><span>响应式模块</span></div>
        </div>
      </header>

      <section class="lesson-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">MODULE 01 · REACTIVITY</p>
            <h2>Mini Vue · 响应式模块</h2>
          </div>
          <p>第 1～16 章已完成</p>
        </div>

        <nav class="lesson-grid" aria-label="响应式学习章节">
          <a class="lesson-card" href="#/chapter-1">
            <span class="chapter-number">01</span>
            <span class="status complete">已完成</span>
            <h2>ref 与 effect</h2>
            <p>验证读取时收集依赖、修改时触发 effect 的最小响应式闭环。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-2">
            <span class="chapter-number">02</span>
            <span class="status complete">已完成</span>
            <h2>effect 依赖清理</h2>
            <p>观察条件分支切换后，新依赖未收集、旧依赖未删除的问题。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-3">
            <span class="chapter-number">03</span>
            <span class="status complete">已完成</span>
            <h2>effect 栈与异常恢复</h2>
            <p>观察嵌套 effect 覆盖外层状态，以及异常导致 activeEffect 残留的问题。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-4">
            <span class="chapter-number">04</span>
            <span class="status complete">已完成</span>
            <h2>Proxy 与 reactive</h2>
            <p>观察对象属性读写，并验证不同属性是否拥有各自独立的依赖集合。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-5">
            <span class="chapter-number">05</span>
            <span class="status complete">已完成</span>
            <h2>深层 reactive 与缓存</h2>
            <p>让嵌套对象惰性变成 Proxy，并保证同一原对象始终复用同一代理。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-6">
            <span class="chapter-number">06</span>
            <span class="status complete">已完成</span>
            <h2>computed 的缓存与失效</h2>
            <p>观察派生值的惰性计算、缓存复用，以及依赖变化后的失效通知。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-7">
            <span class="chapter-number">07</span>
            <span class="status complete">已完成</span>
            <h2>watch 与调度隔离</h2>
            <p>分离 source 的依赖收集和 callback，让回调读取不会污染 watch 的依赖。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-8">
            <span class="chapter-number">08</span>
            <span class="status complete">已完成</span>
            <h2>effect 生命周期与 stop</h2>
            <p>让 effect 可以手动执行、停止订阅，并理解停止后的 runner 行为。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-9">
            <span class="chapter-number">09</span>
            <span class="status complete">已完成</span>
            <h2>scheduler 队列与 nextTick</h2>
            <p>把同步触发改成微任务刷新，并合并同一 tick 内重复的 effect job。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-10">
            <span class="chapter-number">10</span>
            <span class="status complete">已完成</span>
            <h2>对象结构操作</h2>
            <p>让 in、Object.keys 和 delete 参与依赖追踪，并区分属性新增与更新。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-11">
            <span class="chapter-number">11</span>
            <span class="status complete">已完成</span>
            <h2>数组索引与 length</h2>
            <p>处理新增索引导致 length 变化，以及缩短 length 删除多个索引的依赖联动。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-12">
            <span class="chapter-number">12</span>
            <span class="status complete">已完成</span>
            <h2>数组方法插桩</h2>
            <p>统一搜索方法中的 raw/Proxy 身份，并暂停修改方法产生的内部依赖收集。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-13">
            <span class="chapter-number">13</span>
            <span class="status complete">已完成</span>
            <h2>readonly 与代理身份</h2>
            <p>建立深层只读视图，并用身份工具区分 raw、reactive 与 readonly。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-14">
            <span class="chapter-number">14</span>
            <span class="status complete">已完成</span>
            <h2>shallow 响应式工具</h2>
            <p>只代理或保护根对象，让嵌套对象保持 raw，并为不同代理深度建立独立缓存。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-15">
            <span class="chapter-number">15</span>
            <span class="status complete">已完成</span>
            <h2>markRaw 与跳过代理</h2>
            <p>用不可枚举的内部标记控制代理资格，并让不可扩展对象保持原始身份。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>

          <a class="lesson-card" href="#/chapter-16">
            <span class="chapter-number">16</span>
            <span class="status complete">已完成</span>
            <h2>ref 对象转换与 shallowRef</h2>
            <p>区分 ref 的 raw 比较值与对外 Proxy，并用 shallowRef 和 triggerRef 控制浅层更新。</p>
            <span class="enter-link">进入测试页 →</span>
          </a>
        </nav>
      </section>

      <section class="lesson-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">MODULE 00 · JS / TYPESCRIPT</p>
            <h2>基础补充</h2>
          </div>
          <p>按主课程需要随时复习</p>
        </div>

        <nav class="lesson-grid foundation-grid" aria-label="JS 和 TypeScript 基础课程">
          <a class="lesson-card compact-lesson" href="#/basics/promise">
            <span class="chapter-number">00 · 01</span>
            <span class="status complete">已完成</span>
            <h2>Promise 基础</h2>
            <p>同步代码、微任务与保存刷新 Promise。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>

          <a class="lesson-card compact-lesson" href="#/basics/prototype">
            <span class="chapter-number">00 · 02</span>
            <span class="status complete">已完成</span>
            <h2>原型与属性归属</h2>
            <p>理解 in、hasOwnProperty.call 和 Object.keys。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>

          <a class="lesson-card compact-lesson" href="#/basics/call-apply-bind">
            <span class="chapter-number">00 · 03</span>
            <span class="status complete">已完成</span>
            <h2>call、apply 与 bind</h2>
            <p>区分 this 指定、参数传递和函数绑定。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>

          <a class="lesson-card compact-lesson" href="#/basics/this">
            <span class="chapter-number">00 · 04</span>
            <span class="status complete">已完成</span>
            <h2>this 的指向</h2>
            <p>比较普通调用、对象方法和显式绑定。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>

          <a class="lesson-card compact-lesson" href="#/basics/object-define-property">
            <span class="chapter-number">00 · 05</span>
            <span class="status complete">已完成</span>
            <h2>Object.defineProperty</h2>
            <p>理解属性描述符、不可枚举内部键，以及 markRaw 标记的配置方式。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>
        </nav>
      </section>
    `,
  });
}
