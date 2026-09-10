import { nextTick, reactive, ref, watch, watchEffect } from "mini-vue";

export function renderWatchDeepEffectPage(container: HTMLElement): void {
  const state = reactive({
    user: { name: "Ada", score: 0 },
  });
  const scheduleCount = ref(0);

  const events: string[] = [];
  let deepRuns = 0;
  let greeting = "Hello Ada";

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 19</p>
        <h1>deep watch 与 watchEffect</h1>
        <p class="lead">观察深层嵌套变化怎样触发 deep watch，以及 watchEffect 怎样自动跟随依赖。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">name</span>
            <strong id="deep-name" class="metric-value">Ada</strong>
          </div>
          <div class="metric">
            <span class="result-label">score</span>
            <strong id="deep-score" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">deep watch 次数</span>
            <strong id="deep-runs" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">watchEffect 结果</span>
            <strong id="deep-greeting" class="metric-value">Hello Ada</strong>
          </div>
        </div>

        <div class="actions">
          <button id="deep-set-name" type="button">修改 name</button>
          <button id="deep-set-score" class="secondary" type="button">score + 1</button>
          <button id="deep-run-flush" class="secondary" type="button">演示 pre / post</button>
        </div>

        <p id="deep-status" class="status-panel">点击按钮观察 deep watch、watchEffect 与 pre/post 调度。</p>
        <ol id="deep-events" class="event-log" aria-live="polite"></ol>

        <ol class="steps">
          <li>deep watch 应追踪 user 内部的 name 与 score 变化。</li>
          <li>watchEffect 应立即执行一次，并在依赖变化后自动重新计算。</li>
          <li>调度演示会故意先创建 post watch；正确顺序仍应是 pre → post → nextTick。</li>
        </ol>
      </section>
    </main>
  `;

  const nameElement = container.querySelector<HTMLElement>("#deep-name")!;
  const scoreElement = container.querySelector<HTMLElement>("#deep-score")!;
  const runsElement = container.querySelector<HTMLElement>("#deep-runs")!;
  const greetingElement = container.querySelector<HTMLElement>("#deep-greeting")!;
  const statusElement = container.querySelector<HTMLElement>("#deep-status")!;
  const eventsElement = container.querySelector<HTMLOListElement>("#deep-events")!;

  function updateView(): void {
    nameElement.textContent = state.user.name;
    scoreElement.textContent = String(state.user.score);
    runsElement.textContent = String(deepRuns);
    greetingElement.textContent = greeting;
    eventsElement.replaceChildren(
      ...events.map((message) => {
        const item = document.createElement("li");
        item.textContent = message;
        return item;
      }),
    );
  }

  watch(
    () => state.user,
    (newValue) => {
      deepRuns++;
      events.push(
        `deep watch → name=${newValue.name}, score=${newValue.score}`,
      );
    },
    { deep: true },
  );

  watchEffect(() => {
    greeting = `Hello ${state.user.name}（${state.user.score} 分）`;
  });

  // 故意让 post 先订阅，用来验证执行顺序不依赖订阅顺序。
  watch(
    () => scheduleCount.value,
    (newValue) => {
      events.push(`post:${newValue}`);
    },
    { flush: "post" },
  );

  watch(
    () => scheduleCount.value,
    (newValue) => {
      events.push(`pre:${newValue}`);
    },
    { flush: "pre" },
  );

  container.querySelector<HTMLButtonElement>("#deep-set-name")!.addEventListener("click", () => {
    const previousRuns = deepRuns;
    state.user.name = state.user.name === "Ada" ? "Grace" : "Ada";
    const didRun = deepRuns > previousRuns;

    statusElement.textContent = didRun
      ? "deep watch 已捕捉到 name 的嵌套变化。"
      : "name 已修改，但 deep watch 没有触发。";
    statusElement.className = `status-panel ${didRun ? "success-status" : "warning-status"}`;
    updateView();
  });

  container.querySelector<HTMLButtonElement>("#deep-set-score")!.addEventListener("click", () => {
    const previousRuns = deepRuns;
    state.user.score++;
    const didRun = deepRuns > previousRuns;

    statusElement.textContent = didRun
      ? "deep watch 已捕捉到 score 的嵌套变化。"
      : "score 已修改，但 deep watch 没有触发。";
    statusElement.className = `status-panel ${didRun ? "success-status" : "warning-status"}`;
    updateView();
  });

  container.querySelector<HTMLButtonElement>("#deep-run-flush")!.addEventListener("click", async () => {
    events.length = 0;
    events.push("sync:start");
    scheduleCount.value++;
    events.push("sync:end");
    updateView();

    await nextTick();

    events.push("nextTick");
    const expectedEvents = [
      "sync:start",
      "sync:end",
      `pre:${scheduleCount.value}`,
      `post:${scheduleCount.value}`,
      "nextTick",
    ];
    const hasExpectedOrder =
      events.length === expectedEvents.length &&
      events.every((event, index) => event === expectedEvents[index]);

    statusElement.textContent = hasExpectedOrder
      ? "调度顺序正确：同步代码 → pre → post → nextTick。"
      : `调度顺序异常：${events.join(" → ")}`;
    statusElement.className = `status-panel ${hasExpectedOrder ? "success-status" : "warning-status"}`;
    updateView();
  });

  updateView();
}
