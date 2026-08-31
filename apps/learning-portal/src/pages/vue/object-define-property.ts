export function renderObjectDefinePropertyPage(container: HTMLElement): void {
  const internalKey = Symbol("mini-vue.skipReactive");
  let target: Record<PropertyKey, unknown> = {};

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">MODULE 00 · LESSON 05</p>
        <h1>Object.defineProperty</h1>
        <p class="lead">比较普通赋值与属性描述符，分别观察属性是否可写、可枚举和可删除。</p>

        <div class="metric-grid">
          <div class="metric">
            <span class="result-label">Object.keys(target)</span>
            <strong id="define-property-keys" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">Reflect.ownKeys(target)</span>
            <strong id="define-property-own-keys" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">target.hidden</span>
            <strong id="define-property-hidden-value" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">hidden 的三个布尔配置</span>
            <strong id="define-property-descriptor" class="metric-value small-value">-</strong>
          </div>
          <div class="metric">
            <span class="result-label">SKIP Symbol 可读取</span>
            <strong id="define-property-symbol-value" class="metric-value small-value">-</strong>
          </div>
        </div>

        <div class="actions">
          <button id="define-properties" type="button">定义两种属性</button>
          <button id="mutate-properties" type="button">尝试修改与删除</button>
          <button id="define-skip-property" type="button">创建 markRaw 风格标记</button>
          <button id="reset-properties" class="secondary" type="button">重置对象</button>
        </div>

        <p id="define-property-status" class="status-panel">先预测结果，再点击“定义两种属性”。</p>
        <ol id="define-property-events" class="event-log" aria-live="polite"></ol>

        <ol class="steps">
          <li>普通赋值创建的 normal 默认可写、可枚举、可配置。</li>
          <li>defineProperty 只填写 value 时，三个布尔配置默认都是 false。</li>
          <li>不可枚举属性仍然存在并可直接读取，只是不出现在 Object.keys 中。</li>
          <li>markRaw 使用不可枚举 Symbol 保存内部信息，Reflect.ownKeys 仍能检查到它。</li>
        </ol>
      </section>
    </main>
  `;

  const keysElement = container.querySelector<HTMLElement>("#define-property-keys")!;
  const ownKeysElement = container.querySelector<HTMLElement>("#define-property-own-keys")!;
  const hiddenValueElement = container.querySelector<HTMLElement>("#define-property-hidden-value")!;
  const descriptorElement = container.querySelector<HTMLElement>("#define-property-descriptor")!;
  const symbolValueElement = container.querySelector<HTMLElement>("#define-property-symbol-value")!;
  const statusElement = container.querySelector<HTMLElement>("#define-property-status")!;
  const eventsElement = container.querySelector<HTMLOListElement>("#define-property-events")!;

  function appendEvent(message: string): void {
    const item = document.createElement("li");
    item.textContent = message;
    eventsElement.append(item);
  }

  function updateMetrics(): void {
    const descriptor = Object.getOwnPropertyDescriptor(target, "hidden");
    const ownKeys = Reflect.ownKeys(target).map((key) => String(key));

    keysElement.textContent = Object.keys(target).join(", ") || "[]";
    ownKeysElement.textContent = ownKeys.join(", ") || "[]";
    hiddenValueElement.textContent = String(Reflect.get(target, "hidden") ?? "不存在");
    descriptorElement.textContent = descriptor
      ? `W:${String(descriptor.writable)} E:${String(descriptor.enumerable)} C:${String(descriptor.configurable)}`
      : "不存在";
    symbolValueElement.textContent = String(Reflect.get(target, internalKey) ?? "不存在");
  }

  container.querySelector<HTMLButtonElement>("#define-properties")!.addEventListener("click", () => {
    target = {};
    eventsElement.replaceChildren();

    Reflect.set(target, "normal", 1);
    Object.defineProperty(target, "hidden", {
      value: 1,
    });

    const normalDescriptor = Object.getOwnPropertyDescriptor(target, "normal")!;
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(target, "hidden")!;

    appendEvent(`normal：writable=${String(normalDescriptor.writable)}, enumerable=${String(normalDescriptor.enumerable)}, configurable=${String(normalDescriptor.configurable)}`);
    appendEvent(`hidden：writable=${String(hiddenDescriptor.writable)}, enumerable=${String(hiddenDescriptor.enumerable)}, configurable=${String(hiddenDescriptor.configurable)}`);
    statusElement.textContent = "两种属性都存在，但它们的描述符默认值不同。";
    statusElement.className = "status-panel success-status";
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#mutate-properties")!.addEventListener("click", () => {
    if (!Object.prototype.hasOwnProperty.call(target, "hidden")) {
      statusElement.textContent = "请先点击“定义两种属性”。";
      statusElement.className = "status-panel warning-status";
      return;
    }

    const didSetNormal = Reflect.set(target, "normal", 2);
    const didSetHidden = Reflect.set(target, "hidden", 2);
    const didDeleteNormal = Reflect.deleteProperty(target, "normal");
    const didDeleteHidden = Reflect.deleteProperty(target, "hidden");

    appendEvent(`修改 normal=${String(didSetNormal)}，修改 hidden=${String(didSetHidden)}`);
    appendEvent(`删除 normal=${String(didDeleteNormal)}，删除 hidden=${String(didDeleteHidden)}`);
    statusElement.textContent = "writable 决定修改，configurable 决定删除；返回 false 表示操作被拒绝。";
    statusElement.className = "status-panel success-status";
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#define-skip-property")!.addEventListener("click", () => {
    if (!Object.isExtensible(target)) {
      statusElement.textContent = "当前对象不可扩展，无法添加内部标记。请先重置。";
      statusElement.className = "status-panel warning-status";
      return;
    }

    Object.defineProperty(target, internalKey, {
      value: true,
      configurable: true,
    });

    appendEvent(`SKIP 可读取：${String(Reflect.get(target, internalKey))}`);
    appendEvent(`Object.keys 不包含 SKIP；Reflect.ownKeys 包含：${String(Reflect.ownKeys(target).includes(internalKey))}`);
    statusElement.textContent = "内部 Symbol 已创建：可读取，但不参与 Object.keys 枚举。";
    statusElement.className = "status-panel success-status";
    updateMetrics();
  });

  container.querySelector<HTMLButtonElement>("#reset-properties")!.addEventListener("click", () => {
    target = {};
    eventsElement.replaceChildren();
    statusElement.textContent = "对象已重置。";
    statusElement.className = "status-panel";
    updateMetrics();
  });

  updateMetrics();
}
