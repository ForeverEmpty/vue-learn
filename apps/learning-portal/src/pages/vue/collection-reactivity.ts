import { effect, reactive, stop, watch, type EffectRunner } from "mini-vue";

type RecordEvent = (message: string) => void;
type Experiment = (record: RecordEvent) => void;

function verify(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const experiments: Record<string, { title: string; run: Experiment }> = {
  native: {
    title: "检查点 1：观察原生 Proxy",
    run(record) {
      const raw = new Map([["count", 1]]);
      const proxy = new Proxy(raw, {});
      for (const [label, read] of [
        ["proxy.get", () => proxy.get("count")],
        ["proxy.size", () => proxy.size],
      ] as const) {
        let sawTypeError = false;
        try { read(); } catch (error) {
          sawTypeError = error instanceof TypeError;
          record(`${label} → ${error instanceof Error ? error.message : String(error)}`);
        }
        verify(sawTypeError, `${label} 没有出现预期的 receiver 错误`);
      }
      record(`指定 raw this：get(count) = ${Map.prototype.get.call(raw, "count")}`);
      record(`指定 raw receiver：size = ${Reflect.get(raw, "size", raw)}`);
    },
  },
  map: {
    title: "检查点 3：Map 键、存在性与 size",
    run(record) {
      const map = reactive(new Map([["count", 1]]));
      const runners: EffectRunner[] = [];
      let getRuns = 0;
      let hasRuns = 0;
      let sizeRuns = 0;
      try {
        runners.push(effect(() => { getRuns++; record(`get → ${map.get("count")}`); }));
        runners.push(effect(() => { hasRuns++; record(`has → ${map.has("count")}`); }));
        runners.push(effect(() => { sizeRuns++; record(`size → ${map.size}`); }));
        record("操作：已有 count 从 1 改成 2");
        map.set("count", 2);
        verify(getRuns === 2 && hasRuns === 1 && sizeRuns === 1, "换值应只重跑 get");
        record("操作：删除 count");
        map.delete("count");
        verify(Number(getRuns) === 3 && Number(hasRuns) === 2 && Number(sizeRuns) === 2, "删除应通知 get、has 和 size");
      } finally { runners.forEach(stop); }
    },
  },
  set: {
    title: "检查点 3/4：Set 去重与 clear",
    run(record) {
      const set = reactive(new Set<number>());
      let runs = 0;
      const runner = effect(() => { runs++; record(`has(1)=${set.has(1)}，size=${set.size}`); });
      try {
        set.add(1);
        set.add(1);
        set.clear();
        set.clear();
        record(`effect 共运行 ${runs} 次（含首次）`);
        verify(runs === 3, "预期首次、新增、清空各一次；重复操作不通知");
      } finally { stop(runner); }
    },
  },
  iterate: {
    title: "检查点 4B：keys 与 values",
    run(record) {
      const map = reactive(new Map([["a", 1]]));
      const runners: EffectRunner[] = [];
      let keyRuns = 0;
      let valueRuns = 0;
      try {
        runners.push(effect(() => { keyRuns++; record(`keys → ${JSON.stringify([...map.keys()])}`); }));
        runners.push(effect(() => { valueRuns++; record(`values → ${JSON.stringify([...map.values()])}`); }));
        map.set("a", 2);
        record(`换值后：keys ${keyRuns} 次，values ${valueRuns} 次（含首次）`);
        verify(keyRuns === 1 && valueRuns === 2, "已有键换值应只影响 values 遍历");
        record(`Set.entries → ${JSON.stringify([...reactive(new Set([1])).entries()])}`);
      } finally { runners.forEach(stop); }
    },
  },
  watch: {
    title: "检查点 6：deep watch 与集合衔接",
    run(record) {
      const user = { score: 0 };
      const map = reactive(new Map([["user", user]]));
      let runs = 0;
      const stopWatch = watch(() => map, () => { runs++; record(`deep watch 第 ${runs} 次通知`); }, { deep: true });
      try {
        reactive(user).score++;
        verify(runs === 1, "traverse 尚未通过集合包装方法读取内部值");
        map.delete("user");
        reactive(user).score++;
        record(`删除后再次修改旧 user，通知总数为 ${runs}`);
        verify(Number(runs) === 2, "旧元素删除后应清理其深层依赖");
      } finally { stopWatch(); }
    },
  },
};

export function renderCollectionReactivityPage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>
      <section class="test-card">
        <p class="eyebrow">CHAPTER 20 · REACTIVITY</p>
        <h1>Map/Set 集合响应式</h1>
        <p class="lead">本章已完成方法包装、依赖分类、迭代器、raw 身份和 deep watch。每个实验都调用本项目的 Mini Vue。</p>
        <div class="metric-grid">
          <div class="metric"><span class="result-label">章节状态</span><strong class="metric-value small-value">已完成</strong></div>
          <div class="metric"><span class="result-label">章节测试</span><strong class="metric-value small-value">27 项通过</strong></div>
          <div class="metric"><span class="result-label">完整回归</span><strong class="metric-value small-value">235 项通过</strong></div>
        </div>
        <p class="lead">下方按钮会重新运行各阶段的独立实验，可用于复习原生错误和验证最终实现。</p>
        <div class="actions">
          <button type="button" data-experiment="native">观察原生 Proxy</button>
          <button type="button" class="secondary" data-experiment="map">测试 Map 依赖</button>
          <button type="button" class="secondary" data-experiment="set">测试 Set 去重</button>
          <button type="button" class="secondary" data-experiment="iterate">测试 keys / values</button>
          <button type="button" class="secondary" data-experiment="watch">测试 deep watch</button>
        </div>
        <p id="collection-status" class="status-panel success-status" aria-live="polite">全部检查点已完成。点击任意按钮可重新验证对应行为。</p>
        <ol id="collection-events" class="event-log" aria-live="polite"></ol>
        <ol class="steps">
          <li>方法不报错，只证明 receiver 正确；还要测试依赖是否通知。</li>
          <li>已有 Map 键换值：get 和 values 更新，has、size、keys 保持原次数。</li>
          <li>本章复习题已批改；下一步继续审查响应式模块的剩余必修缺口。</li>
        </ol>
      </section>
    </main>
  `;

  const status = container.querySelector<HTMLElement>("#collection-status")!;
  const log = container.querySelector<HTMLOListElement>("#collection-events")!;
  const record: RecordEvent = (message) => {
    const item = document.createElement("li");
    item.textContent = message;
    log.append(item);
  };
  for (const button of container.querySelectorAll<HTMLButtonElement>("[data-experiment]")) {
    button.addEventListener("click", () => {
      const experiment = experiments[button.dataset.experiment ?? ""];
      if (!experiment) return;
      log.replaceChildren();
      record(experiment.title);
      try {
        experiment.run(record);
        status.textContent = `${experiment.title}：本次实验符合预期。`;
        status.className = "status-panel success-status";
      } catch (error) {
        record(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
        status.textContent = `${experiment.title}：未通过，按本章对应检查点继续实现。`;
        status.className = "status-panel warning-status";
      }
    });
  }
}
