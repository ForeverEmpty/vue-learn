import { describe, expect, it, vi } from "vitest";
import {
  computed,
  nextTick,
  reactive,
  ref,
  watch,
} from "../src";

describe("watch 数据源标准化与多数据源：第二十一章", () => {
  it("21 / 1：原有 getter source 仍然提供正确的新旧值", () => {
    const state = reactive({ count: 0 });
    const records: Array<[number, number | undefined]> = [];

    watch(
      () => state.count,
      (newValue, oldValue) => {
        records.push([newValue, oldValue]);
      },
    );

    state.count = 1;

    expect(records).toEqual([[1, 0]]);
  });

  it("21 / 1：getter 返回 reactive 对象时，默认不监听对象内部变化", () => {
    const state = reactive({ profile: { score: 0 } });
    const callback = vi.fn();

    watch(() => state.profile, callback);
    state.profile.score++;

    expect(callback).not.toHaveBeenCalled();
  });

  it("21 / 2A：可以直接把 ref 作为 source", () => {
    const count = ref(0);
    const records: Array<[number, number | undefined]> = [];

    watch(count, (newValue, oldValue) => {
      records.push([newValue, oldValue]);
    });

    count.value = 1;

    expect(records).toEqual([[1, 0]]);
  });

  it("21 / 2A：computed 也能作为 ref 类型的 source", () => {
    const count = ref(1);
    const doubled = computed(() => count.value * 2);
    const records: Array<[number, number | undefined]> = [];

    watch(doubled, (newValue, oldValue) => {
      records.push([newValue, oldValue]);
    });

    count.value = 2;

    expect(records).toEqual([[4, 2]]);
  });

  it("21 / 2A：ref source 的 immediate 首次旧值为 undefined", () => {
    const count = ref(5);
    const records: Array<[number, number | undefined]> = [];

    watch(
      count,
      (newValue, oldValue) => {
        records.push([newValue, oldValue]);
      },
      { immediate: true },
    );

    expect(records).toEqual([[5, undefined]]);
  });

  it("21 / 2B：直接监听 reactive 对象时默认深入监听", () => {
    const profile = reactive({ user: { score: 0 } });
    const records: Array<[typeof profile, typeof profile | undefined]> = [];

    watch(profile, (newValue, oldValue) => {
      records.push([newValue, oldValue]);
    });

    profile.user.score++;

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual([profile, profile]);
  });

  it("21 / 2B：直接监听 reactive Map 时沿用集合的深层遍历", () => {
    const users = reactive(new Map([["Ada", { score: 0 }]]));
    const callback = vi.fn();

    watch(users, callback);
    users.get("Ada")!.score++;

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("21 / 2B：直接 reactive source 新增根属性也会触发", () => {
    const state = reactive<Record<string, number>>({ count: 0 });
    const callback = vi.fn();

    watch(state, callback);
    state.extra = 1;

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("21 / 3A：多个 source 按原顺序向 callback 提供值", () => {
    const count = ref(0);
    const state = reactive({ title: "start" });
    const records: Array<[[number, string], [number, string] | undefined]> = [];

    watch([count, () => state.title] as const, (newValues, oldValues) => {
      records.push([newValues, oldValues]);
    });

    state.title = "ready";

    expect(records).toEqual([[[0, "ready"], [0, "start"]]]);
  });

  it("21 / 3A：多个 source 中可以包含 computed", () => {
    const count = ref(1);
    const doubled = computed(() => count.value * 2);
    const records: Array<[number, number]> = [];

    watch([count, doubled] as const, ([nextCount, nextDouble]) => {
      records.push([nextCount, nextDouble]);
    });

    count.value = 2;

    expect(records).toEqual([[2, 4]]);
  });

  it("21 / 3A：多个 source 中的 reactive 对象默认深入监听", () => {
    const profile = reactive({ score: 0 });
    const enabled = ref(true);
    const callback = vi.fn();

    watch([profile, enabled] as const, callback);
    profile.score++;

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("21 / 3B：新结果数组不是同一个数组，也必须逐项判断是否变化", () => {
    const state = reactive({ count: 0 });
    const callback = vi.fn();

    watch([() => state.count % 2] as const, callback);
    state.count = 2;

    expect(callback).not.toHaveBeenCalled();
  });

  it("21 / 3B：多个 source 只要有一项真正变化就执行 callback", () => {
    const state = reactive({ count: 0 });
    const title = ref("start");
    const callback = vi.fn();

    watch([() => state.count % 2, title] as const, callback);
    state.count = 2;
    title.value = "ready";

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0]).toEqual([0, "ready"]);
    expect(callback.mock.calls[0]?.[1]).toEqual([0, "start"]);
  });

  it('21 / 3C：flush: "pre" 合并不同 source 的同一轮变化', async () => {
    const count = ref(0);
    const title = ref("start");
    const records: Array<[[number, string], [number, string] | undefined]> = [];

    watch(
      [count, title] as const,
      (newValues, oldValues) => {
        records.push([newValues, oldValues]);
      },
      { flush: "pre" },
    );

    count.value = 1;
    title.value = "loading";
    count.value = 2;
    title.value = "ready";

    expect(records).toEqual([]);
    await nextTick();
    expect(records).toEqual([[[2, "ready"], [0, "start"]]]);
  });

  it("21 / 3C：多个 source 继续复用 cleanup 与 stop 生命周期", () => {
    const count = ref(0);
    const title = ref("start");
    let callbackRuns = 0;
    let cleanupRuns = 0;

    const stopWatch = watch([count, title] as const, (_newValue, _oldValue, onCleanup) => {
      callbackRuns++;
      onCleanup(() => {
        cleanupRuns++;
      });
    });

    count.value = 1;
    stopWatch();
    title.value = "ignored";

    expect(callbackRuns).toBe(1);
    expect(cleanupRuns).toBe(1);
  });

  it("21 / 4：reactive 数组本身是一个隐式 deep source", () => {
    const list = reactive([1]);
    const records: Array<[number[], number[] | undefined]> = [];

    watch(list, (newList, oldList) => {
      records.push([newList, oldList]);
    });

    list.push(2);

    expect(records).toHaveLength(1);
    expect(records[0]?.[0]).toBe(list);
    expect(records[0]?.[1]).toBe(list);
  });

  it("21 / 4：getter 返回 reactive 数组时，默认不追踪数组内部变化", () => {
    const list = reactive([1]);
    const callback = vi.fn();

    watch(() => list, callback);
    list.push(2);

    expect(callback).not.toHaveBeenCalled();
  });

  it("21 / 4：想把数组长度作为一个 source 时，应在外层写 source 数组", () => {
    const list = reactive([1]);
    const records: Array<[number[], number[] | undefined]> = [];

    watch([() => list.length] as const, (newValues, oldValues) => {
      records.push([newValues, oldValues]);
    });

    list.push(2);

    expect(records).toEqual([[[2], [1]]]);
  });
});
