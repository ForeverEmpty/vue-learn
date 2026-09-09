import { describe, expect, it } from "vitest";
import { ref, watch } from "../src";

describe("watch immediate、清理与停止：第十八章", () => {
  it("默认 watch 创建时仍然不调用 callback", () => {
    const count = ref(0);
    let callbackRuns = 0;

    watch(
      () => count.value,
      () => {
        callbackRuns++;
      },
    );

    expect(callbackRuns).toBe(0);
  });

  it("默认 watch 变化后仍提供正确的新旧值", () => {
    const count = ref(0);
    const records: Array<[number, number | undefined]> = [];

    watch(
      () => count.value,
      (newValue, oldValue) => {
        records.push([newValue, oldValue]);
      },
    );

    count.value = 1;

    expect(records).toEqual([[1, 0]]);
  });

  it("immediate watch 创建时立即调用 callback，oldValue 为 undefined", () => {
    const count = ref(0);
    const records: Array<[number, number | undefined]> = [];

    watch(
      () => count.value,
      (newValue, oldValue) => {
        records.push([newValue, oldValue]);
      },
      { immediate: true },
    );

    expect(records).toEqual([[0, undefined]]);
  });

  it("immediate 首次回调后，下一次变化使用初始值作为 oldValue", () => {
    const count = ref(0);
    const records: Array<[number, number | undefined]> = [];

    watch(
      () => count.value,
      (newValue, oldValue) => {
        records.push([newValue, oldValue]);
      },
      { immediate: true },
    );

    count.value = 1;

    expect(records).toEqual([
      [0, undefined],
      [1, 0],
    ]);
  });

  it("onCleanup 只注册清理，不会在当前 callback 中立即执行", () => {
    const count = ref(0);
    let cleanupRuns = 0;

    watch(
      () => count.value,
      (_newValue, _oldValue, onCleanup) => {
        onCleanup(() => {
          cleanupRuns++;
        });
      },
    );

    count.value = 1;

    expect(cleanupRuns).toBe(0);
  });

  it("下一次有效 callback 前执行上一次注册的清理", () => {
    const count = ref(0);
    const events: string[] = [];

    watch(
      () => count.value,
      (newValue, _oldValue, onCleanup) => {
        events.push(`callback:${String(newValue)}`);
        onCleanup(() => {
          events.push(`cleanup:${String(newValue)}`);
        });
      },
    );

    count.value = 1;
    count.value = 2;

    expect(events).toEqual(["callback:1", "cleanup:1", "callback:2"]);
  });

  it("连续变化时每次只清理上一次 callback 创建的副作用", () => {
    const count = ref(0);
    const events: string[] = [];

    watch(
      () => count.value,
      (newValue, _oldValue, onCleanup) => {
        events.push(`callback:${String(newValue)}`);
        onCleanup(() => {
          events.push(`cleanup:${String(newValue)}`);
        });
      },
      { immediate: true },
    );

    count.value = 1;
    count.value = 2;

    expect(events).toEqual([
      "callback:0",
      "cleanup:0",
      "callback:1",
      "cleanup:1",
      "callback:2",
    ]);
  });

  it("依赖触发但 source 结果相同时不调用 callback，也不提前清理", () => {
    const useFirst = ref(true);
    const first = ref(0);
    const second = ref(1);
    let callbackRuns = 0;
    let cleanupRuns = 0;

    watch(
      () => (useFirst.value ? first.value : second.value),
      (_newValue, _oldValue, onCleanup) => {
        callbackRuns++;
        onCleanup(() => {
          cleanupRuns++;
        });
      },
    );

    first.value = 1;
    useFirst.value = false;

    expect(callbackRuns).toBe(1);
    expect(cleanupRuns).toBe(0);
  });

  it("调用停止函数后，源依赖变化不再执行 getter 或 callback", () => {
    const count = ref(0);
    let getterRuns = 0;
    let callbackRuns = 0;

    const stopWatch = watch(
      () => {
        getterRuns++;
        return count.value;
      },
      () => {
        callbackRuns++;
      },
    );

    const runsBeforeStop = getterRuns;
    stopWatch();
    count.value = 1;

    expect(getterRuns).toBe(runsBeforeStop);
    expect(callbackRuns).toBe(0);
  });

  it("停止 watch 时执行最后一次清理，重复停止不会重复执行", () => {
    const count = ref(0);
    let cleanupRuns = 0;

    const stopWatch = watch(
      () => count.value,
      (_newValue, _oldValue, onCleanup) => {
        onCleanup(() => {
          cleanupRuns++;
        });
      },
      { immediate: true },
    );

    stopWatch();
    stopWatch();
    count.value = 1;

    expect(cleanupRuns).toBe(1);
  });

  it("source 初始值为 undefined 时，immediate 仍执行 callback", () => {
    const value = ref<number | undefined>(undefined);
    let callbackRuns = 0;

    watch(
      () => value.value,
      () => {
        callbackRuns++;
      },
      { immediate: true },
    );

    expect(callbackRuns).toBe(1);
  });

  it("cleanup 抛出异常时，槽位不会保留旧函数", () => {
    const count = ref(0);
    let cleanupRuns = 0;

    watch(
      () => count.value,
      (_newValue, _oldValue, onCleanup) => {
        onCleanup(() => {
          cleanupRuns++;
          throw new Error("boom");
        });
      },
    );

    count.value = 1;
    expect(cleanupRuns).toBe(0);

    expect(() => {
      count.value = 2;
    }).toThrow("boom");
    expect(cleanupRuns).toBe(1);

    count.value = 3;
    expect(cleanupRuns).toBe(1);
  });

  it("条件 source 在停止前后都能正确清理依赖", () => {
    const useFirst = ref(true);
    const first = ref(0);
    const second = ref(10);
    let callbackRuns = 0;

    const stopWatch = watch(
      () => (useFirst.value ? first.value : second.value),
      () => {
        callbackRuns++;
      },
    );

    useFirst.value = false;
    callbackRuns = 0;

    first.value = 1;
    expect(callbackRuns).toBe(0);

    stopWatch();
    second.value = 11;
    expect(callbackRuns).toBe(0);
  });
});
