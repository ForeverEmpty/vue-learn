import { computed, reactive, ref, watch } from "mini-vue";

type RecordEvent = (message: string) => void;
type Experiment = (record: RecordEvent) => void;

function verify(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const experiments: Record<string, { title: string; run: Experiment }> = {
  getter: {
    title: "检查点 1：原有 getter source",
    run(record) {
      const state = reactive({ count: 0 });
      const events: string[] = [];
      const stopWatch = watch(() => state.count, (newValue, oldValue) => {
        events.push(`${String(oldValue)} → ${newValue}`);
      });

      try {
        state.count = 1;
        record(`callback：${events.join(", ")}`);
        verify(events.join(",") === "0 → 1", "getter source 的旧行为被破坏");
      } finally {
        stopWatch();
      }
    },
  },
  ref: {
    title: "检查点 2A：ref 与 computed source",
    run(record) {
      const count = ref(1);
      const doubled = computed(() => count.value * 2);
      const events: string[] = [];
      const stopCount = watch(count, (value) => events.push(`count=${value}`));
      const stopDoubled = watch(doubled, (value) => events.push(`double=${value}`));

      try {
        count.value = 2;
        events.forEach(record);
        verify(
          events.includes("count=2") && events.includes("double=4"),
          "ref source 的 getter 必须读取 .value",
        );
      } finally {
        stopCount();
        stopDoubled();
      }
    },
  },
  reactive: {
    title: "检查点 2B：direct reactive source",
    run(record) {
      const profile = reactive({ user: { score: 0 } });
      let callbackRuns = 0;
      let sameIdentity = false;
      const stopWatch = watch(profile, (newValue, oldValue) => {
        callbackRuns++;
        sameIdentity = newValue === oldValue;
      });

      try {
        profile.user.score++;
        record(`callback 次数：${callbackRuns}`);
        record(`newValue === oldValue：${sameIdentity}`);
        verify(callbackRuns === 1 && sameIdentity, "direct reactive 需要 traverse 和 forceTrigger");
      } finally {
        stopWatch();
      }
    },
  },
  multiple: {
    title: "检查点 3：多个 source",
    run(record) {
      const count = ref(0);
      const state = reactive({ title: "start" });
      const events: string[] = [];
      const stopWatch = watch(
        [count, () => state.title] as const,
        (newValues, oldValues) => {
          events.push(`${JSON.stringify(oldValues)} → ${JSON.stringify(newValues)}`);
        },
      );

      try {
        state.title = "ready";
        events.forEach(record);
        verify(
          events[0] === '[0,"start"] → [0,"ready"]',
          "组合 getter 应按 source 顺序提供新旧值数组",
        );
      } finally {
        stopWatch();
      }
    },
  },
  arrays: {
    title: "检查点 4：两种数组身份",
    run(record) {
      const list = reactive([1]);
      let directRuns = 0;
      let getterRuns = 0;
      const stopDirect = watch(list, () => directRuns++);
      const stopGetter = watch(() => list, () => getterRuns++);

      try {
        list.push(2);
        record(`watch(list)：${directRuns} 次`);
        record(`watch(() => list)：${getterRuns} 次`);
        verify(directRuns === 1 && getterRuns === 0, "reactive 数组应先按 reactive source 识别");
      } finally {
        stopDirect();
        stopGetter();
      }
    },
  },
};

export function renderWatchSourcesPage(container: HTMLElement): void {
  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>
      <section class="test-card">
        <p class="eyebrow">CHAPTER 21 · REACTIVITY</p>
        <h1>watch 数据源标准化与多数据源</h1>
        <p class="lead">把 getter、ref、reactive 对象和 source 数组转换成统一内部协议，再复用已有的调度与生命周期。</p>
        <div class="metric-grid">
          <div class="metric"><span class="result-label">章节状态</span><strong class="metric-value small-value">已完成</strong></div>
          <div class="metric"><span class="result-label">章节测试</span><strong class="metric-value small-value">18 项通过</strong></div>
          <div class="metric"><span class="result-label">完整回归</span><strong class="metric-value small-value">253 项通过</strong></div>
        </div>
        <p class="lead">先运行 getter 基线，再按 2A、2B、3、4 的顺序完成。实验失败时会显示当前缺失的机制。</p>
        <div class="actions">
          <button type="button" data-experiment="getter">验证 getter 基线</button>
          <button type="button" class="secondary" data-experiment="ref">测试 ref / computed</button>
          <button type="button" class="secondary" data-experiment="reactive">测试 direct reactive</button>
          <button type="button" class="secondary" data-experiment="multiple">测试多个 source</button>
          <button type="button" class="secondary" data-experiment="arrays">区分数组身份</button>
        </div>
        <p id="watch-sources-status" class="status-panel success-status" aria-live="polite">全部检查点和复习题已完成。点击按钮可以重新验证各类 source。</p>
        <ol id="watch-sources-events" class="event-log" aria-live="polite"></ol>
        <ol class="steps">
          <li>ref 的标准化 getter 必须读取 .value，才能收集依赖。</li>
          <li>direct reactive 必须遍历，并处理新旧值为同一个 Proxy 的情况。</li>
          <li>多个 source 只创建一个 effect，结果数组需要逐项比较。</li>
        </ol>
      </section>
    </main>
  `;

  const status = container.querySelector<HTMLElement>("#watch-sources-status")!;
  const log = container.querySelector<HTMLOListElement>("#watch-sources-events")!;
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
        status.textContent = `${experiment.title}：尚未通过，请完成对应检查点。`;
        status.className = "status-panel warning-status";
      }
    });
  }
}
