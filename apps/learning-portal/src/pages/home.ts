export function renderHomePage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <header class="hero-header">
        <p class="eyebrow">PROGRAMMING STUDY LAB</p>
        <h1>多语言学习目录</h1>
        <p class="lead">当前以 TypeScript / Vue 为主线；Java 是独立支线，从多线程开始。每门课程拥有自己的源码、文档和复习题目录。</p>
      </header>

      <section class="lesson-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">PRIMARY · TYPESCRIPT / VUE</p>
            <h2>Mini Vue · 响应式模块</h2>
          </div>
          <p>主课程</p>
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
        </nav>
      </section>

      <section class="lesson-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">MODULE 00 · JS / TYPESCRIPT</p>
            <h2>00. 基础补充</h2>
          </div>
          <p>大章节 00 表示基础</p>
        </div>

        <nav class="lesson-grid basics-grid" aria-label="JS 和 TypeScript 基础课程">
          <a class="lesson-card" href="#/basics/promise">
            <span class="chapter-number">MODULE 00 · LESSON 01</span>
            <span class="status complete">已完成</span>
            <h2>Promise 基础</h2>
            <p>观察同步代码、Promise 微任务，以及保存刷新 Promise 的真正含义。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>

          <a class="lesson-card" href="#/basics/prototype">
            <span class="chapter-number">MODULE 00 · LESSON 02</span>
            <span class="status complete">已完成</span>
            <h2>原型与属性归属</h2>
            <p>理解 in、hasOwnProperty.call 和 Object.keys 如何看待原型链。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>

          <a class="lesson-card" href="#/basics/call-apply-bind">
            <span class="chapter-number">MODULE 00 · LESSON 03</span>
            <span class="status complete">已完成</span>
            <h2>call、apply 与 bind</h2>
            <p>理解 this 指定、参数传递方式，以及 bind 为什么返回一个新函数。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>

          <a class="lesson-card" href="#/basics/this">
            <span class="chapter-number">MODULE 00 · LESSON 04</span>
            <span class="status complete">已完成</span>
            <h2>this 的指向</h2>
            <p>比较对象方法、函数提取、call 和 bind 如何改变普通函数的调用上下文。</p>
            <span class="enter-link">进入实验页 →</span>
          </a>
        </nav>
      </section>

      <section class="lesson-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow java-eyebrow">SECONDARY · JAVA 21</p>
            <h2>Java 并发编程</h2>
          </div>
          <p>独立学习区 · 从多线程开始</p>
        </div>

        <nav class="lesson-grid basics-grid" aria-label="Java 学习课程">
          <a class="lesson-card java-card" href="#/java">
            <span class="chapter-number">JAVA COURSE</span>
            <span class="status learning">已创建</span>
            <h2>进入 Java 学习区</h2>
            <p>快速复习必要语法后，从 Thread、start、run、join 和线程生命周期开始。</p>
            <span class="enter-link">查看 Java 目录 →</span>
          </a>
        </nav>
      </section>
    </main>
  `
}
