import {
  effect,
  isReactive,
  ref,
  shallowRef,
  triggerRef,
} from "mini-vue";

export function renderRefObjectPage(container: HTMLElement): void {
  const deepProfile = ref({ name: "Ada" });
  const shallowProfile = shallowRef({ name: "Lin" });
  let deepObservedName = "";
  let shallowObservedName = "";
  let deepRuns = 0;
  let shallowRuns = 0;

  effect(() => {
    deepRuns++;
    deepObservedName = deepProfile.value.name;
  });

  effect(() => {
    shallowRuns++;
    shallowObservedName = shallowProfile.value.name;
  });

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 16</p>
        <h1>ref 对象转换与 shallowRef</h1>
        <p class="lead">比较 deep ref 与 shallowRef 的对象身份、嵌套属性触发方式，并观察 triggerRef 的手动通知作用。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">isReactive(deepProfile.value)</span>
            <strong id="deep-ref-reactive" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">deep effect 中的 name</span>
            <strong id="deep-ref-observed" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">deep effect 次数</span>
            <strong id="deep-ref-runs" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isReactive(shallowProfile.value)</span>
            <strong id="shallow-ref-reactive" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">shallow effect 中的 name</span>
            <strong id="shallow-ref-observed" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">shallow effect 次数</span>
            <strong id="shallow-ref-runs" class="metric-value">-</strong>
          </div>
        </div>

        <div class="actions">
          <button id="mutate-deep-ref" type="button">修改 deep 嵌套 name</button>
          <button id="mutate-shallow-ref" type="button">修改 shallow 嵌套 name</button>
          <button id="trigger-shallow-ref" class="secondary" type="button">triggerRef(shallow)</button>
          <button id="replace-shallow-ref" class="secondary" type="button">替换 shallow.value</button>
        </div>

        <p id="ref-object-status" class="status-panel warning-status">起点中 ref 尚未转换对象，shallowRef 暂时复用 ref，triggerRef 也还没有通知订阅者。</p>

        <ol class="steps">
          <li>正确的 deep ref 会把对象 value 转换成 reactive，所以修改嵌套 name 会自动触发。</li>
          <li>shallowRef 保留 raw 对象，直接修改嵌套 name 不会自动触发。</li>
          <li>triggerRef 不修改值，只让 effect 重新读取已经变化的 shallow raw 对象。</li>
          <li>替换 shallowRef.value 仍然会自动触发，因为 effect 订阅了 ref 自身的 value dep。</li>
        </ol>
      </section>
    </main>
  `;

  const deepReactiveElement = container.querySelector<HTMLElement>("#deep-ref-reactive")!;
  const deepObservedElement = container.querySelector<HTMLElement>("#deep-ref-observed")!;
  const deepRunsElement = container.querySelector<HTMLElement>("#deep-ref-runs")!;
  const shallowReactiveElement = container.querySelector<HTMLElement>("#shallow-ref-reactive")!;
  const shallowObservedElement = container.querySelector<HTMLElement>("#shallow-ref-observed")!;
  const shallowRunsElement = container.querySelector<HTMLElement>("#shallow-ref-runs")!;
  const statusElement = container.querySelector<HTMLElement>("#ref-object-status")!;

  function updateMetrics(): void {
    deepReactiveElement.textContent = String(isReactive(deepProfile.value));
    deepObservedElement.textContent = deepObservedName;
    deepRunsElement.textContent = String(deepRuns);
    shallowReactiveElement.textContent = String(isReactive(shallowProfile.value));
    shallowObservedElement.textContent = shallowObservedName;
    shallowRunsElement.textContent = String(shallowRuns);
  }

  container.querySelector<HTMLButtonElement>("#mutate-deep-ref")!.addEventListener("click", () => {
    const beforeRuns = deepRuns;
    deepProfile.value.name = deepProfile.value.name === "Ada" ? "Grace" : "Ada";
    const triggered = deepRuns !== beforeRuns;

    statusElement.textContent = `修改 deepProfile.value.name 后，deep effect ${triggered ? "重新执行了" : "没有执行：对象仍未转换成 reactive"}。`;
    statusElement.className = `status-panel ${triggered ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#mutate-shallow-ref")!.addEventListener("click", () => {
    const beforeRuns = shallowRuns;
    shallowProfile.value.name = shallowProfile.value.name === "Lin" ? "Ming" : "Lin";
    const triggered = shallowRuns !== beforeRuns;

    statusElement.textContent = `修改 shallowProfile.value.name 后，shallow effect ${triggered ? "错误地自动执行了" : "没有自动执行"}。`;
    statusElement.className = `status-panel ${triggered ? "warning-status" : "success-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#trigger-shallow-ref")!.addEventListener("click", () => {
    const beforeRuns = shallowRuns;
    triggerRef(shallowProfile);
    const triggered = shallowRuns !== beforeRuns;

    statusElement.textContent = `调用 triggerRef 后，shallow effect ${triggered ? "重新读取了内部值" : "仍未执行"}。`;
    statusElement.className = `status-panel ${triggered ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#replace-shallow-ref")!.addEventListener("click", () => {
    const beforeRuns = shallowRuns;
    shallowProfile.value = {
      name: shallowProfile.value.name === "Lin" ? "Ming" : "Lin",
    };
    const triggered = shallowRuns !== beforeRuns;

    statusElement.textContent = `替换 shallowProfile.value 后，shallow effect ${triggered ? "正确地重新执行了" : "没有执行"}。`;
    statusElement.className = `status-panel ${triggered ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  updateMetrics();
}
