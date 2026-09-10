import { describe, expect, it } from "vitest";
import {
  nextTick,
  queueJob,
  queuePostFlushJob,
  reactive,
  ref,
  watch,
  watchEffect,
} from "../src";

describe("deep watch、watchEffect 与监听调度：第十九章", () => {
  it("非 deep watch 不追踪嵌套对象内部的变化", () => {
    const state = reactive({ user: { name: "Ada" } });
    let callbackRuns = 0;

    watch(
      () => state.user,
      () => {
        callbackRuns++;
      },
    );

    state.user.name = "Grace";

    expect(callbackRuns).toBe(0);
  });

  it("deep watch 追踪嵌套对象内部的变化", () => {
    const state = reactive({ user: { name: "Ada" } });
    let callbackRuns = 0;

    watch(
      () => state.user,
      () => {
        callbackRuns++;
      },
      { deep: true },
    );

    state.user.name = "Grace";

    expect(callbackRuns).toBe(1);
  });

  it("deep watch 追踪数组元素的替换", () => {
    const state = reactive({ list: [1, 2, 3] });
    let callbackRuns = 0;

    watch(
      () => state.list,
      () => {
        callbackRuns++;
      },
      { deep: true },
    );

    state.list[0] = 10;

    expect(callbackRuns).toBe(1);
  });

  it("deep watch 追踪可枚举 Symbol 属性内部的变化", () => {
    const profileKey = Symbol("profile");
    const state = reactive({ [profileKey]: { score: 0 } });
    let callbackRuns = 0;

    watch(
      () => state,
      () => {
        callbackRuns++;
      },
      { deep: true },
    );

    state[profileKey].score++;

    expect(callbackRuns).toBe(1);
  });

  it("deep watch 嵌套变化时的新旧值是同一个已更新对象", () => {
    const state = reactive({ user: { name: "Ada" } });
    let currentUser: { name: string } | undefined;
    let previousUser: { name: string } | undefined;

    watch(
      () => state.user,
      (newValue, oldValue) => {
        currentUser = newValue;
        previousUser = oldValue;
      },
      { deep: true },
    );

    state.user.name = "Grace";

    expect(currentUser).toBe(previousUser);
    expect(currentUser?.name).toBe("Grace");
    expect(previousUser?.name).toBe("Grace");
  });

  it("watchEffect 创建时立即执行一次", () => {
    const count = ref(0);
    let runs = 0;

    watchEffect(() => {
      runs++;
      void count.value;
    });

    expect(runs).toBe(1);
  });

  it("watchEffect 依赖变化后重新执行", () => {
    const count = ref(0);
    let latest = -1;

    watchEffect(() => {
      latest = count.value;
    });

    count.value = 5;

    expect(latest).toBe(5);
  });

  it("watchEffect 修改自己读取的依赖时不会同步递归执行", () => {
    const count = ref(0);
    let runs = 0;

    watchEffect(() => {
      runs++;
      count.value++;
    });

    expect(count.value).toBe(1);
    expect(runs).toBe(1);
  });

  it("watchEffect 的 onCleanup 在下一次执行前运行", () => {
    const count = ref(0);
    const events: string[] = [];

    watchEffect((onCleanup) => {
      onCleanup(() => {
        events.push("cleanup");
      });
      events.push(`run:${count.value}`);
    });

    count.value = 1;

    expect(events).toEqual(["run:0", "cleanup", "run:1"]);
  });

  it("watchEffect 停止后不再执行，并运行最后一次 cleanup", () => {
    const count = ref(0);
    let runs = 0;
    let cleanupRuns = 0;

    const stop = watchEffect((onCleanup) => {
      runs++;
      void count.value;
      onCleanup(() => {
        cleanupRuns++;
      });
    });

    stop();
    count.value = 1;

    expect(runs).toBe(1);
    expect(cleanupRuns).toBe(1);
  });

  it("不指定 flush 时保持同步执行，兼容前 18 章", () => {
    const count = ref(0);
    let runs = 0;

    watch(
      () => count.value,
      () => {
        runs++;
      },
    );

    count.value = 1;

    expect(runs).toBe(1);
  });

  it('flush: "sync" 每次变化同步执行一次 callback', () => {
    const count = ref(0);
    const records: number[] = [];

    watch(
      () => count.value,
      (newValue) => {
        records.push(newValue);
      },
      { flush: "sync" },
    );

    count.value = 1;
    count.value = 2;

    expect(records).toEqual([1, 2]);
  });

  it('flush: "sync" 重入时为下一次 callback 保存最近的 oldValue', () => {
    const count = ref(0);
    const records: Array<[number, number | undefined]> = [];

    watch(
      () => count.value,
      (newValue, oldValue) => {
        records.push([newValue, oldValue]);
        if (newValue === 1) count.value = 2;
      },
      { flush: "sync" },
    );

    count.value = 1;
    count.value = 3;

    expect(records).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
    ]);
  });

  it('flush: "pre" 将同一轮多次变化合并为一次微任务执行', async () => {
    const count = ref(0);
    const records: number[] = [];

    watch(
      () => count.value,
      (newValue) => {
        records.push(newValue);
      },
      { flush: "pre" },
    );

    count.value = 1;
    count.value = 2;
    count.value = 3;

    expect(records).toEqual([]);

    await nextTick();

    expect(records).toEqual([3]);
  });

  it('flush: "post" 的 callback 在 pre 之后执行', async () => {
    const count = ref(0);
    const events: string[] = [];

    watch(
      () => count.value,
      () => {
        events.push("pre");
      },
      { flush: "pre" },
    );

    watch(
      () => count.value,
      () => {
        events.push("post");
      },
      { flush: "post" },
    );

    count.value = 1;
    expect(events).toEqual([]);

    await nextTick();

    expect(events).toEqual(["pre", "post"]);
  });

  it('post watcher 先订阅时，flush: "post" 仍在 pre 之后执行', async () => {
    const count = ref(0);
    const events: string[] = [];

    watch(
      () => count.value,
      () => {
        events.push("post");
      },
      { flush: "post" },
    );

    watch(
      () => count.value,
      () => {
        events.push("pre");
      },
      { flush: "pre" },
    );

    count.value = 1;
    await nextTick();

    expect(events).toEqual(["pre", "post"]);
  });

  it("traverse 对循环引用对象安全，不会无限递归", () => {
    const state = reactive<{ node: { name: string; self?: unknown } }>({
      node: { name: "root" },
    });

    state.node.self = state.node;

    let callbackRuns = 0;

    watch(
      () => state.node,
      () => {
        callbackRuns++;
      },
      { deep: true },
    );

    state.node.name = "child";

    expect(callbackRuns).toBe(1);
  });

  it("deep watch 切换 getter 返回值后，旧对象的依赖被清理", () => {
    const state = reactive({
      current: { value: 1 },
      other: { value: 2 },
    });
    const useOther = ref(false);
    let callbackRuns = 0;

    watch(
      () => (useOther.value ? state.other : state.current),
      () => {
        callbackRuns++;
      },
      { deep: true },
    );

    useOther.value = true;
    callbackRuns = 0;

    state.current.value = 99;
    expect(callbackRuns).toBe(0);

    state.other.value = 100;
    expect(callbackRuns).toBe(1);
  });

  it("watchEffect 条件分支切换后，旧分支依赖不再触发", () => {
    const useA = ref(true);
    const a = ref(1);
    const b = ref(2);
    let latest = -1;

    watchEffect(() => {
      latest = useA.value ? a.value : b.value;
    });

    useA.value = false;
    latest = -1;

    a.value = 100;
    expect(latest).toBe(-1);

    b.value = 200;
    expect(latest).toBe(200);
  });

  it('flush: "pre" 时 stop 后已入队的 job 不再执行', async () => {
    const count = ref(0);
    let callbackRuns = 0;

    const stopWatch = watch(
      () => count.value,
      () => {
        callbackRuns++;
      },
      { flush: "pre" },
    );

    count.value = 1;
    stopWatch();
    await nextTick();

    expect(callbackRuns).toBe(0);
  });

  it("post flush 中注册新的 post job 仍会执行", async () => {
    const count = ref(0);
    const events: string[] = [];

    watch(
      () => count.value,
      () => {
        events.push("outer");
        queuePostFlushJob(() => {
          events.push("inner");
        });
      },
      { flush: "post" },
    );

    count.value = 1;
    await nextTick();

    expect(events).toEqual(["outer", "inner"]);
  });

  it("post flush 中注册的普通 job 不会丢失，nextTick 会等待它执行", async () => {
    const events: string[] = [];

    queuePostFlushJob(() => {
      events.push("post");
      queueJob(() => {
        events.push("next-pre");
      });
    });

    await nextTick();

    expect(events).toEqual(["post", "next-pre"]);
  });
});
