import {
  computed,
  effect,
  isRef,
  proxyRefs,
  reactive,
  ref,
  toRef,
  unref,
} from "mini-vue";

export function renderRefUtilitiesPage(container: HTMLElement): void {
  const state = reactive({ count: 1 });
  const countReference = toRef(state, "count");
  const nameReference = ref("Ada");
  const user = proxyRefs({
    name: nameReference,
    role: "student",
  });
  const plusOne = computed({
    get: () => state.count + 1,
    set: (value: number) => {
      state.count = value - 1;
    },
  });

  let linkedObservedCount = 0;
  let linkedRuns = 0;
  let lastComputedSetResult = "尚未写入";

  effect(() => {
    linkedRuns++;
    linkedObservedCount = countReference.value;
  });

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">CHAPTER 17</p>
        <h1>ref 工具链与可写 computed</h1>
        <p class="lead">观察属性桥接、自动解包与 computed 反向写入：工具函数减少了重复的 .value，但仍要保留正确的源身份与依赖链。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">isRef(countReference)</span>
            <strong id="utility-is-ref" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">unref(countReference)</span>
            <strong id="utility-unref" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">state.count</span>
            <strong id="utility-source-count" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">toRef effect 中的 count</span>
            <strong id="utility-linked-count" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">toRef effect 次数</span>
            <strong id="utility-linked-runs" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">proxyRefs user.name</span>
            <strong id="utility-proxy-name" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">原 nameRef.value</span>
            <strong id="utility-name-ref" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">plusOne.value</span>
            <strong id="utility-computed-value" class="metric-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">computed 写入结果</span>
            <strong id="utility-computed-set" class="metric-value small-value">-</strong>
          </div>
        </div>

        <div class="actions">
          <button id="utility-update-source" type="button">state.count + 1</button>
          <button id="utility-update-link" type="button">countReference.value + 1</button>
          <button id="utility-update-proxy" class="secondary" type="button">通过 proxyRefs 修改 name</button>
          <button id="utility-update-computed" class="secondary" type="button">写入 plusOne.value = 10</button>
        </div>

        <p id="utility-status" class="status-panel warning-status">起点中 toRef 只是快照、proxyRefs 尚未解包、computed 也还没有转发 setter。</p>

        <ol class="steps">
          <li>isRef 应识别 ref、shallowRef 与 computed，但不能误判普通的 { value } 对象。</li>
          <li>toRef 的 value 必须直接读写 state.count，不能保存创建时的数字快照。</li>
          <li>proxyRefs 读取时解包；给旧 ref 属性写普通值时，应修改旧 ref.value。</li>
          <li>可写 computed 把写入交给用户 setter，再由源状态变化驱动缓存失效。</li>
        </ol>
      </section>
    </main>
  `;

  const isRefElement = container.querySelector<HTMLElement>("#utility-is-ref")!;
  const unrefElement = container.querySelector<HTMLElement>("#utility-unref")!;
  const sourceCountElement = container.querySelector<HTMLElement>("#utility-source-count")!;
  const linkedCountElement = container.querySelector<HTMLElement>("#utility-linked-count")!;
  const linkedRunsElement = container.querySelector<HTMLElement>("#utility-linked-runs")!;
  const proxyNameElement = container.querySelector<HTMLElement>("#utility-proxy-name")!;
  const nameRefElement = container.querySelector<HTMLElement>("#utility-name-ref")!;
  const computedValueElement = container.querySelector<HTMLElement>("#utility-computed-value")!;
  const computedSetElement = container.querySelector<HTMLElement>("#utility-computed-set")!;
  const statusElement = container.querySelector<HTMLElement>("#utility-status")!;

  function updateMetrics(): void {
    isRefElement.textContent = String(isRef(countReference));
    unrefElement.textContent = String(unref(countReference));
    sourceCountElement.textContent = String(state.count);
    linkedCountElement.textContent = String(linkedObservedCount);
    linkedRunsElement.textContent = String(linkedRuns);
    proxyNameElement.textContent = String(user.name);
    nameRefElement.textContent = nameReference.value;
    computedValueElement.textContent = String(plusOne.value);
    computedSetElement.textContent = lastComputedSetResult;
  }

  container.querySelector<HTMLButtonElement>("#utility-update-source")!.addEventListener("click", () => {
    const beforeRuns = linkedRuns;
    state.count++;
    const synchronized = linkedRuns !== beforeRuns && linkedObservedCount === state.count;

    statusElement.textContent = `修改源属性后，toRef ${synchronized ? "同步更新并触发了 effect" : "仍停留在创建时的快照"}。`;
    statusElement.className = `status-panel ${synchronized ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#utility-update-link")!.addEventListener("click", () => {
    countReference.value++;
    const synchronized = countReference.value === state.count;

    statusElement.textContent = `修改 countReference.value 后，源属性${synchronized ? "同步变化" : "没有变化"}。`;
    statusElement.className = `status-panel ${synchronized ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#utility-update-proxy")!.addEventListener("click", () => {
    const nextName = nameReference.value === "Ada" ? "Grace" : "Ada";
    Reflect.set(user, "name", nextName);
    const preservedReference = nameReference.value === nextName;

    statusElement.textContent = `通过 proxyRefs 写普通值后，原 nameRef ${preservedReference ? "被保留并更新" : "没有更新"}。`;
    statusElement.className = `status-panel ${preservedReference ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#utility-update-computed")!.addEventListener("click", () => {
    const didSet = Reflect.set(plusOne, "value", 10);
    lastComputedSetResult = `${String(didSet)} / source=${String(state.count)}`;
    const synchronized = didSet && state.count === 9 && plusOne.value === 10;

    statusElement.textContent = `写入可写 computed ${synchronized ? "已通过 setter 更新源状态" : "尚未成功转发给 setter"}。`;
    statusElement.className = `status-panel ${synchronized ? "success-status" : "warning-status"}`;
    updateMetrics();
  });

  updateMetrics();
}
