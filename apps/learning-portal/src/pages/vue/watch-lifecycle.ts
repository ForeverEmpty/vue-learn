import { ref, watch } from "mini-vue";

export function renderWatchLifecyclePage(container: HTMLElement): void {
  const count = ref(0);
  let callbackRuns = 0;
  let cleanupRuns = 0;
  let stopRequested = false;
  const events: string[] = [];

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 18</p>
        <h1>watch 的 immediate、清理与停止</h1>
        <p class="lead">观察首次 callback、两轮 callback 之间的用户清理，以及停止后依赖是否真正断开。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">count.value</span>
            <strong id="watch-life-count" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">callback 次数</span>
            <strong id="watch-life-callbacks" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">cleanup 次数</span>
            <strong id="watch-life-cleanups" class="metric-value">0</strong>
          </div>
          <div class="metric">
            <span class="result-label">停止请求</span>
            <strong id="watch-life-stopped" class="metric-value small-value">否</strong>
          </div>
        </div>

        <div class="actions">
          <button id="watch-life-update" type="button">count + 1</button>
          <button id="watch-life-stop" class="secondary" type="button">停止 watch</button>
          <button id="watch-life-update-after-stop" class="secondary" type="button">停止后再次 count + 1</button>
        </div>

        <p id="watch-life-status" class="status-panel warning-status">起点会忽略 immediate、onCleanup 与停止函数。正确实现后，页面创建时应已经出现 callback:0。</p>
        <ol id="watch-life-events" class="event-log" aria-live="polite"></ol>

        <ol class="steps">
          <li>immediate 首次 callback 应记录 callback:0，oldValue 是 undefined。</li>
          <li>下一次 callback 前应先出现上一轮 cleanup。</li>
          <li>停止 watch 时应执行最后一次 cleanup。</li>
          <li>停止后再次修改 count，不应增加 callback 或 cleanup 次数。</li>
        </ol>
      </section>
    </main>
  `;

  const countElement = container.querySelector<HTMLElement>("#watch-life-count")!;
  const callbackElement = container.querySelector<HTMLElement>("#watch-life-callbacks")!;
  const cleanupElement = container.querySelector<HTMLElement>("#watch-life-cleanups")!;
  const stoppedElement = container.querySelector<HTMLElement>("#watch-life-stopped")!;
  const statusElement = container.querySelector<HTMLElement>("#watch-life-status")!;
  const eventsElement = container.querySelector<HTMLOListElement>("#watch-life-events")!;

  function updateView(): void {
    countElement.textContent = String(count.value);
    callbackElement.textContent = String(callbackRuns);
    cleanupElement.textContent = String(cleanupRuns);
    stoppedElement.textContent = stopRequested ? "是" : "否";
    eventsElement.replaceChildren(
      ...events.map((message) => {
        const item = document.createElement("li");
        item.textContent = message;
        return item;
      }),
    );
  }

  const stopWatch = watch(
    () => count.value,
    (newValue, oldValue, onCleanup) => {
      callbackRuns++;
      events.push(
        `callback:${String(newValue)}（old=${String(oldValue)}）`,
      );

      onCleanup(() => {
        cleanupRuns++;
        events.push(`cleanup:${String(newValue)}`);
      });
    },
    { immediate: true },
  );

  container.querySelector<HTMLButtonElement>("#watch-life-update")!.addEventListener("click", () => {
    const previousCallbacks = callbackRuns;
    count.value++;
    const didRun = callbackRuns > previousCallbacks;

    statusElement.textContent = didRun
      ? "source 变化后 callback 已执行；检查事件列表中是否先出现上一轮 cleanup。"
      : "source 已变化，但 callback 没有执行。";
    statusElement.className = `status-panel ${didRun ? "success-status" : "warning-status"}`;
    updateView();
  });

  container.querySelector<HTMLButtonElement>("#watch-life-stop")!.addEventListener("click", () => {
    const previousCleanups = cleanupRuns;
    stopRequested = true;
    stopWatch();
    const didCleanup = cleanupRuns > previousCleanups;

    statusElement.textContent = didCleanup
      ? "停止时已执行最后一次用户 cleanup。"
      : "已请求停止，但最后一次 cleanup 尚未执行。";
    statusElement.className = `status-panel ${didCleanup ? "success-status" : "warning-status"}`;
    updateView();
  });

  container.querySelector<HTMLButtonElement>("#watch-life-update-after-stop")!.addEventListener("click", () => {
    const previousCallbacks = callbackRuns;
    count.value++;
    const stayedStopped = callbackRuns === previousCallbacks;

    statusElement.textContent = stayedStopped
      ? "停止后修改 source，没有再次执行 callback。"
      : "停止函数尚未切断依赖，callback 仍然执行了。";
    statusElement.className = `status-panel ${stayedStopped ? "success-status" : "warning-status"}`;
    updateView();
  });

  updateView();
}
