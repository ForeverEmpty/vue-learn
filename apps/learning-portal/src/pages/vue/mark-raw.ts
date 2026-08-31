import {
  effect,
  isProxy,
  isReactive,
  markRaw,
  reactive,
} from "mini-vue";

export function renderMarkRawPage(container: HTMLElement): void {
  const rawProfile = markRaw({ name: "Ada" });
  const state = reactive({ profile: rawProfile });

  const markedRoot = markRaw({ count: 1 });
  const markedRootResult = reactive(markedRoot);

  const lockedRaw = Object.preventExtensions({ count: 1 });
  const lockedResult = reactive(lockedRaw);

  let observedName = "";
  let effectRuns = 0;

  effect(() => {
    effectRuns++;
    observedName = state.profile.name;
  });

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 15</p>
        <h1>markRaw 与跳过代理</h1>
        <p class="lead">观察“函数返回原对象”和“原对象留下可供代理工厂识别的标记”之间的区别。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">markRaw 根对象保持 raw</span>
            <strong id="marked-root-same" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isProxy(marked root)</span>
            <strong id="marked-root-proxy" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">state.profile === rawProfile</span>
            <strong id="nested-same" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isReactive(state.profile)</span>
            <strong id="nested-reactive" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">不可扩展对象保持 raw</span>
            <strong id="locked-same" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">effect 执行次数</span>
            <strong id="effect-runs" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">effect 中的 name</span>
            <strong id="observed-name" class="metric-value small-value">-</strong>
          </div>
        </div>

        <div class="actions">
          <button id="mutate-nested" type="button">直接修改标记对象的 name</button>
          <button id="replace-profile" class="secondary" type="button">替换根层 profile</button>
        </div>

        <p id="operation-status" class="status-panel warning-status">起点的 markRaw 只返回输入，没有写入 SKIP；所以代理工厂目前仍会创建 Proxy。</p>

        <ol class="steps">
          <li>先比较 markRaw 的返回值和 reactive 的最终返回值，它们是两个不同问题。</li>
          <li>正确实现后，标记根对象和标记嵌套对象都应保持 raw 身份。</li>
          <li>直接修改 rawProfile.name 不会触发 effect，但替换 state.profile 仍会触发。</li>
          <li>最后再处理不可扩展对象，不要把三个检查点一次写完。</li>
        </ol>
      </section>
    </main>
  `;

  const markedRootSameElement = container.querySelector<HTMLElement>("#marked-root-same")!;
  const markedRootProxyElement = container.querySelector<HTMLElement>("#marked-root-proxy")!;
  const nestedSameElement = container.querySelector<HTMLElement>("#nested-same")!;
  const nestedReactiveElement = container.querySelector<HTMLElement>("#nested-reactive")!;
  const lockedSameElement = container.querySelector<HTMLElement>("#locked-same")!;
  const effectRunsElement = container.querySelector<HTMLElement>("#effect-runs")!;
  const observedNameElement = container.querySelector<HTMLElement>("#observed-name")!;
  const operationStatusElement = container.querySelector<HTMLElement>("#operation-status")!;

  function updateMetrics(): void {
    markedRootSameElement.textContent = String(markedRootResult === markedRoot);
    markedRootProxyElement.textContent = String(isProxy(markedRootResult));
    nestedSameElement.textContent = String(state.profile === rawProfile);
    nestedReactiveElement.textContent = String(isReactive(state.profile));
    lockedSameElement.textContent = String(lockedResult === lockedRaw);
    effectRunsElement.textContent = String(effectRuns);
    observedNameElement.textContent = observedName;
  }

  container.querySelector<HTMLButtonElement>("#mutate-nested")!.addEventListener("click", () => {
    const beforeRuns = effectRuns;
    state.profile.name = state.profile.name === "Ada" ? "Grace" : "Ada";
    const triggered = effectRuns !== beforeRuns;

    operationStatusElement.textContent = `直接修改 profile.name 后，effect ${triggered ? "重新执行了：说明嵌套对象仍是 Proxy" : "没有重新执行：说明嵌套对象保持 raw"}。`;
    operationStatusElement.className = `status-panel ${triggered ? "warning-status" : "success-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#replace-profile")!.addEventListener("click", () => {
    const beforeRuns = effectRuns;
    const replacement = markRaw({
      name: state.profile.name === "Ada" ? "Grace" : "Ada",
    });

    state.profile = replacement;
    const triggered = effectRuns !== beforeRuns;

    operationStatusElement.textContent = `替换根层 profile 后，effect ${triggered ? "正确地重新执行了" : "没有重新执行"}。`;
    operationStatusElement.className = `status-panel ${triggered ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  updateMetrics();
}
