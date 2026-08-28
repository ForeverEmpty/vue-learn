import { describe, expect, it } from "vitest";
import { effect, reactive } from "../src";
import { pauseTracking, resetTracking } from "../src/effect";

type MutationMethod = "push" | "pop" | "shift" | "unshift" | "splice";

const mutationCases: Array<
  [method: MutationMethod, initialValues: number[], args: number[]]
> = [
  ["push", [], [1]],
  ["pop", [1], []],
  ["shift", [1], []],
  ["unshift", [], [1]],
  ["splice", [1, 2], [0, 1]],
];

describe("reactive 数组方法：第十二章", () => {
  it("includes 可以使用原对象找到数组中的响应式元素", () => {
    const rawItem = { id: 1 };
    const list = reactive([rawItem]);

    expect(list.includes(rawItem)).toBe(true);
    expect(list.includes(list[0])).toBe(true);
  });

  it("indexOf 和 lastIndexOf 可以使用原对象找到正确位置", () => {
    const rawItem = { id: 1 };
    const list = reactive([rawItem, rawItem]);

    expect(list.indexOf(rawItem)).toBe(0);
    expect(list.lastIndexOf(rawItem)).toBe(1);
  });

  it("includes 仍会追踪已有索引的值变化", () => {
    const list = reactive(["A"]);
    let includesB = false;
    let runs = 0;

    effect(() => {
      runs++;
      includesB = list.includes("B");
    });

    list[0] = "B";

    expect(includesB).toBe(true);
    expect(runs).toBe(2);
  });

  it("includes 仍会追踪数组新增元素", () => {
    const list = reactive(["A"]);
    let includesB = false;
    let runs = 0;

    effect(() => {
      runs++;
      includesB = list.includes("B");
    });

    list.push("B");

    expect(includesB).toBe(true);
    expect(runs).toBe(2);
  });

  it.each(mutationCases)(
    "%s 在 effect 内执行时不会意外订阅数组内部读取",
    (method, initialValues, args) => {
      const list = reactive([...initialValues]);
      const mutation = list[method] as (...values: number[]) => unknown;
      let schedulerCalls = 0;

      effect(
        () => {
          Reflect.apply(mutation, list, args);
        },
        {
          scheduler: () => {
            schedulerCalls++;
          },
        },
      );

      expect(schedulerCalls).toBe(0);
    },
  );

  it("数组方法触发的普通 effect 会在每次执行后重新收集依赖", () => {
    const list = reactive<number[]>([]);
    let observedLength = 0;
    let runs = 0;

    effect(() => {
      runs++;
      observedLength = list.length;
    });

    list.push(1);
    list.push(2);

    expect(observedLength).toBe(2);
    expect(runs).toBe(3);
  });

  it("数组修改方法抛出异常后会恢复依赖收集", () => {
    const rawList: number[] = [];
    Object.preventExtensions(rawList);

    const list = reactive(rawList);
    const state = reactive({ count: 0 });

    let observedCount = 0;
    let runs = 0;
    let didThrow = false;

    effect(() => {
      runs++;

      try {
        list.push(1);
      } catch {
        didThrow = true;
      }

      observedCount = state.count;
    });

    expect(didThrow).toBe(true);
    expect(observedCount).toBe(0);
    expect(runs).toBe(1);

    state.count = 1;

    expect(observedCount).toBe(1);
    expect(runs).toBe(2);
  });

  it("嵌套暂停只会在最外层恢复后继续收集依赖", () => {
    const state = reactive({ skipped: 0, tracked: 0 });
    let runs = 0;

    effect(() => {
      runs++;

      pauseTracking();
      pauseTracking();
      resetTracking();
      state.skipped;

      resetTracking();
      state.tracked;
    });

    state.skipped++;
    expect(runs).toBe(1);

    state.tracked++;
    expect(runs).toBe(2);
  });
});
