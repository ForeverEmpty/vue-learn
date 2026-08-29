import {
  effect,
  isReactive,
  isReadonly,
  shallowReactive,
  shallowReadonly,
} from "mini-vue";

export function renderShallowReactivityPage(container: HTMLElement): void {
  const reactiveRaw = {
    profile: {
      name: "Ada",
    },
  };
  const state = shallowReactive(reactiveRaw);

  const readonlyRaw = {
    profile: {
      name: "Lin",
    },
  };
  const view = shallowReadonly(readonlyRaw);

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
        <p class="eyebrow">CHAPTER 14</p>
        <h1>shallowReactive 与 shallowReadonly</h1>
        <p class="lead">比较根层代理与嵌套 raw 对象：根属性仍被追踪或保护，但 getter 不再继续把嵌套对象转换成 Proxy。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">isReactive(state)</span>
            <strong id="root-reactive" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">state.profile === raw.profile</span>
            <strong id="nested-reactive-raw" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isReactive(state.profile)</span>
            <strong id="nested-reactive" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">effect 执行次数</span>
            <strong id="effect-runs" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">effect 中的 name</span>
            <strong id="observed-name" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isReadonly(view)</span>
            <strong id="root-readonly" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">view.profile === raw.profile</span>
            <strong id="nested-readonly-raw" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">isReadonly(view.profile)</span>
            <strong id="nested-readonly" class="metric-value small-value">-</strong>
          </div>
        </div>

        <div class="actions">
          <button id="mutate-nested" type="button">修改 reactive 嵌套 name</button>
          <button id="replace-root" class="secondary" type="button">替换根层 profile</button>
          <button id="set-readonly-root" type="button">替换 readonly 根层 profile</button>
          <button id="set-readonly-nested" class="secondary" type="button">修改 readonly 嵌套 name</button>
        </div>

        <p id="operation-status" class="status-panel">先观察起点：两个 shallow API 目前仍复用 deep 实现。</p>

        <ol class="steps">
          <li>正确的 shallowReactive 仍会追踪根层 profile，但返回的嵌套对象必须是 raw。</li>
          <li>修改嵌套 name 不应触发 effect；替换根层 profile 应当触发。</li>
          <li>正确的 shallowReadonly 会阻止替换根层 profile，但允许修改嵌套 name。</li>
          <li>浅层与深层代理需要不同缓存，不能因为 raw 相同而复用错误深度的 Proxy。</li>
        </ol>
      </section>
    </main>
  `;

  const rootReactiveElement = container.querySelector<HTMLElement>("#root-reactive")!;
  const nestedReactiveRawElement = container.querySelector<HTMLElement>("#nested-reactive-raw")!;
  const nestedReactiveElement = container.querySelector<HTMLElement>("#nested-reactive")!;
  const effectRunsElement = container.querySelector<HTMLElement>("#effect-runs")!;
  const observedNameElement = container.querySelector<HTMLElement>("#observed-name")!;
  const rootReadonlyElement = container.querySelector<HTMLElement>("#root-readonly")!;
  const nestedReadonlyRawElement = container.querySelector<HTMLElement>("#nested-readonly-raw")!;
  const nestedReadonlyElement = container.querySelector<HTMLElement>("#nested-readonly")!;
  const operationStatusElement = container.querySelector<HTMLElement>("#operation-status")!;

  function updateMetrics(): void {
    rootReactiveElement.textContent = String(isReactive(state));
    nestedReactiveRawElement.textContent = String(state.profile === reactiveRaw.profile);
    nestedReactiveElement.textContent = String(isReactive(state.profile));
    effectRunsElement.textContent = String(effectRuns);
    observedNameElement.textContent = observedName;
    rootReadonlyElement.textContent = String(isReadonly(view));
    nestedReadonlyRawElement.textContent = String(view.profile === readonlyRaw.profile);
    nestedReadonlyElement.textContent = String(isReadonly(view.profile));
  }

  container.querySelector<HTMLButtonElement>("#mutate-nested")!.addEventListener("click", () => {
    const beforeRuns = effectRuns;
    state.profile.name = state.profile.name === "Ada" ? "Grace" : "Ada";
    const triggered = effectRuns !== beforeRuns;

    operationStatusElement.textContent = `修改嵌套 name 后，effect ${triggered ? "重新执行了" : "没有重新执行"}。`;
    operationStatusElement.className = `status-panel ${triggered ? "warning-status" : "success-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#replace-root")!.addEventListener("click", () => {
    const beforeRuns = effectRuns;
    state.profile = { name: state.profile.name === "Ada" ? "Grace" : "Ada" };
    const triggered = effectRuns !== beforeRuns;

    operationStatusElement.textContent = `替换根层 profile 后，effect ${triggered ? "重新执行了" : "没有重新执行"}。`;
    operationStatusElement.className = `status-panel ${triggered ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#set-readonly-root")!.addEventListener("click", () => {
    const before = readonlyRaw.profile;
    Reflect.set(view, "profile", { name: "Root replacement" });
    const blocked = readonlyRaw.profile === before;

    operationStatusElement.textContent = `readonly 根层替换${blocked ? "已被拦截" : "错误地成功了"}。`;
    operationStatusElement.className = `status-panel ${blocked ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#set-readonly-nested")!.addEventListener("click", () => {
    const before = readonlyRaw.profile.name;
    Reflect.set(view.profile, "name", before === "Lin" ? "Ming" : "Lin");
    const changed = readonlyRaw.profile.name !== before;

    operationStatusElement.textContent = `readonly 嵌套 name ${changed ? "修改成功" : "仍被深层只读拦截"}。`;
    operationStatusElement.className = `status-panel ${changed ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  updateMetrics();
}
