import { afterEach, describe, expect, it, vi } from "vitest";
import {
  effect, isReactive, isReadonly, markRaw, nextTick, reactive, readonly,
  shallowReactive, shallowReadonly, stop, toRaw, watch,
} from "../src";
import { ITERATE_KEY } from "../src/effect";

// 本文件是目标行为测试。学习起点的大部分失败是预期，不使用 skip 隐藏缺口。
afterEach(() => vi.restoreAllMocks());

describe("20 / 1 原生行为观察", () => {
  it("空 Proxy 不会自动转发 Map 方法和 size 所需的内部槽位", () => {
    const proxy = new Proxy(new Map([["count", 1]]), {});
    expect(() => proxy.get("count")).toThrow(TypeError);
    expect(() => proxy.size).toThrow(TypeError);
  });

  it("指定 raw receiver 后原生方法和 size 可以读取", () => {
    const raw = new Map([["count", 1]]);
    expect(Map.prototype.get.call(raw, "count")).toBe(1);
    expect(Reflect.get(raw, "size", raw)).toBe(1);
    expect(Object.keys(raw)).toEqual([]);
  });
});

describe("20 / 2A 集合入口与 size", () => {
  it("Map 与 Set 的 size 读取不抛 receiver 错误", () => {
    expect(reactive(new Map([["a", 1]])).size).toBe(1);
    expect(reactive(new Set([1, 2])).size).toBe(2);
  });

  it("四种工厂保留代理身份、缓存与 toRaw", () => {
    const raw = new Map<string, number>();
    const mutable = reactive(raw);
    const immutable = readonly(raw);
    expect(isReactive(mutable)).toBe(true);
    expect(isReadonly(immutable)).toBe(true);
    expect(isReactive(shallowReactive(raw))).toBe(true);
    expect(isReadonly(shallowReadonly(raw))).toBe(true);
    expect(reactive(raw)).toBe(mutable);
    expect(readonly(mutable)).toBe(immutable);
    expect(toRaw(mutable)).toBe(raw);
  });
});

describe("20 / 2B 方法包装", () => {
  it("Map 支持读取、写入、删除以及链式返回代理", () => {
    const map = reactive(new Map<string, number>());
    expect(map.set("a", 1)).toBe(map);
    expect(map.get("a")).toBe(1);
    expect(map.has("a")).toBe(true);
    expect(map.delete("a")).toBe(true);
    expect(map.delete("a")).toBe(false);
    expect(map.get("a")).toBeUndefined();
    const detached = map.get;
    expect(() => detached("a")).toThrow(TypeError);
  });

  it("Set 支持 has/add/delete，add 返回代理且不重复插入", () => {
    const set = reactive(new Set<number>());
    expect(set.add(1)).toBe(set);
    set.add(1);
    expect(set.size).toBe(1);
    expect(set.has(1)).toBe(true);
    expect(set.delete(1)).toBe(true);
    expect(set.delete(1)).toBe(false);
  });
});

describe("20 / 3A 具体键依赖", () => {
  it("更新已存在的键仅通知其 get 订阅者，重复值不通知", () => {
    const map = reactive(new Map([["a", 1], ["b", 2]]));
    const reads = vi.fn(() => map.get("a"));
    const membership = vi.fn(() => map.has("a"));
    effect(reads);
    effect(membership);
    map.set("a", 3);
    map.set("a", 3);
    map.set("b", 4);
    expect(reads.mock.results.map((result) => result.value)).toEqual([1, 3]);
    expect(membership).toHaveBeenCalledTimes(1);
  });

  it("键依赖接入既有分支清理和 stop", () => {
    const map = reactive(new Map([["a", 1], ["b", 2]]));
    const state = reactive({ useA: true });
    const reads = vi.fn(() => map.get(state.useA ? "a" : "b"));
    const runner = effect(reads);
    state.useA = false;
    map.set("a", 10);
    expect(reads).toHaveBeenCalledTimes(2);
    map.set("b", 20);
    expect(reads).toHaveBeenCalledTimes(3);
    stop(runner);
    map.set("b", 30);
    expect(reads).toHaveBeenCalledTimes(3);
  });
});

describe("20 / 3B 新增删除与依赖去重", () => {
  it("不存在的键也能被订阅，新增 undefined 仍改变存在性和 size", () => {
    const map = reactive(new Map<string, number | undefined>());
    const read = vi.fn(() => map.get("a"));
    const membership = vi.fn(() => map.has("a"));
    const size = vi.fn(() => map.size);
    effect(read);
    effect(membership);
    effect(size);
    map.set("a", undefined);
    map.set("a", 2);
    map.delete("missing");
    map.delete("a");
    expect(read).toHaveBeenCalledTimes(4);
    expect(membership.mock.results.map((result) => result.value)).toEqual([false, true, false]);
    expect(size.mock.results.map((result) => result.value)).toEqual([0, 1, 0]);
  });

  it("一次 Set 变更同时命中 has 与 size 时同一个 effect 只执行一次", () => {
    const set = reactive(new Set<number>());
    const read = vi.fn(() => [set.has(1), set.size]);
    effect(read);
    set.add(1);
    set.add(1);
    set.delete(99);
    set.delete(1);
    expect(read.mock.results.map((result) => result.value)).toEqual([
      [false, 0], [true, 1], [false, 0],
    ]);
  });

  it("数字键、字符串键、对象键与内部标记不会互相串订阅", () => {
    const objectKey = {};
    const map = reactive(new Map<unknown, number>([
      [1, 1], ["1", 1], [objectKey, 1], ["size", 1], [ITERATE_KEY, 1],
    ]));
    const numberRead = vi.fn(() => map.get(1));
    const objectRead = vi.fn(() => map.get(objectKey));
    const sizeRead = vi.fn(() => map.size);
    effect(numberRead);
    effect(objectRead);
    effect(sizeRead);
    map.set("1", 2);
    map.set("size", 2);
    map.set(ITERATE_KEY, 2);
    expect(numberRead).toHaveBeenCalledTimes(1);
    expect(objectRead).toHaveBeenCalledTimes(1);
    expect(sizeRead).toHaveBeenCalledTimes(1);
    map.set(objectKey, 2);
    expect(objectRead).toHaveBeenCalledTimes(2);
  });
});

describe("20 / 4A 清空", () => {
  it.each(["Map", "Set"] as const)("%s 非空 clear 通知依赖一次，空 clear 不通知", (kind) => {
    const collection = kind === "Map" ? reactive(new Map([["a", 1]])) : reactive(new Set(["a"]));
    const read = vi.fn(() => [collection.has("a"), collection.size]);
    effect(read);
    expect(collection.clear()).toBeUndefined();
    collection.clear();
    expect(read.mock.results.map((result) => result.value)).toEqual([[true, 1], [false, 0]]);
  });
});

describe("20 / 4B 迭代与 forEach", () => {
  it("更新 Map 值不影响 keys/size，但影响 values/entries/默认遍历", () => {
    const map = reactive(new Map([["a", 1]]));
    const keys = vi.fn(() => [...map.keys()]);
    const values = vi.fn(() => [...map.values()]);
    const entries = vi.fn(() => [...map.entries()]);
    const defaultEntries = vi.fn(() => [...map]);
    const size = vi.fn(() => map.size);
    for (const read of [keys, values, entries, defaultEntries, size]) effect(read);
    map.set("a", 2);
    expect(keys).toHaveBeenCalledTimes(1);
    expect(size).toHaveBeenCalledTimes(1);
    expect(values.mock.results.at(-1)?.value).toEqual([2]);
    expect(entries.mock.results.at(-1)?.value).toEqual([["a", 2]]);
    expect(defaultEntries).toHaveBeenCalledTimes(2);
    map.set("b", 3);
    map.delete("a");
    map.clear();
    expect(keys).toHaveBeenCalledTimes(4);
    expect(values).toHaveBeenCalledTimes(5);
    expect(entries).toHaveBeenCalledTimes(5);
  });

  it("Set 的 entries 返回二元组，其余迭代返回元素且支持 next", () => {
    const set = reactive(new Set([1]));
    const read = vi.fn(() => [...set]);
    effect(read);
    set.add(2);
    expect(read.mock.results.at(-1)?.value).toEqual([1, 2]);
    expect([...set.entries()]).toEqual([[1, 1], [2, 2]]);
    expect([...set.keys()]).toEqual([1, 2]);
    const iterator = set.values();
    expect(iterator[Symbol.iterator]()).toBe(iterator);
    expect(iterator.next()).toEqual({ value: 1, done: false });
    expect(iterator.next()).toEqual({ value: 2, done: false });
    expect(iterator.next().done).toBe(true);
  });

  it("forEach 传递正确的 value/key/代理集合及 thisArg", () => {
    const map = reactive(new Map([["a", 1]]));
    const context = { total: 0 };
    const read = vi.fn(() => {
      context.total = 0;
      map.forEach(function (this: typeof context, value, key, observed) {
        expect(key).toBe("a");
        expect(observed).toBe(map);
        this.total += value;
      }, context);
    });
    effect(read);
    map.set("a", 2);
    expect(read).toHaveBeenCalledTimes(2);
    expect(context.total).toBe(2);
    const set = reactive(new Set([1]));
    set.forEach((value, key, observed) => {
      expect(value).toBe(key);
      expect(observed).toBe(set);
    });
  });
});

describe("20 / 5A 深浅与只读", () => {
  it("get 和迭代的对象按 deep/shallow 模式转换", () => {
    const key = {};
    const value = { count: 1 };
    const raw = new Map([[key, value]]);
    const deep = reactive(raw);
    expect(isReactive(deep.get(key))).toBe(true);
    expect(deep.get(key)).toBe(deep.get(key));
    expect(isReactive([...deep.keys()][0])).toBe(true);
    expect(isReactive([...deep.values()][0])).toBe(true);
    expect(shallowReactive(raw).get(key)).toBe(value);
    expect(isReadonly(readonly(raw).get(key))).toBe(true);
    expect(shallowReadonly(raw).get(key)).toBe(value);
    expect(isReadonly([...readonly(new Set([value]))][0])).toBe(true);
  });

  it("readonly 拦截集合方法，仍保留方法约定的返回值", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rawMap = new Map([["a", 1]]);
    const rawSet = new Set([1]);
    for (const createView of [readonly, shallowReadonly]) {
      const map = createView(rawMap);
      const set = createView(rawSet);
      expect(map.set("b", 2)).toBe(map);
      expect(set.add(2)).toBe(set);
      expect(map.delete("a")).toBe(false);
      expect(set.delete(1)).toBe(false);
      expect(map.clear()).toBeUndefined();
      expect(set.clear()).toBeUndefined();
    }
    expect([...rawMap]).toEqual([["a", 1]]);
    expect([...rawSet]).toEqual([1]);
    expect(warn).toHaveBeenCalledTimes(12);
  });

  it("沿用本项目 readonly 不主动订阅的规则，shallow 只追踪集合根层", () => {
    const item = { count: 1 };
    const raw = new Map([["a", item]]);
    const readonlyRead = vi.fn(() => readonly(raw).get("a"));
    const shallow = shallowReactive(raw);
    const shallowRead = vi.fn(() => shallow.get("a")?.count);
    effect(readonlyRead);
    effect(shallowRead);
    item.count++;
    expect(shallowRead).toHaveBeenCalledTimes(1);
    shallow.set("a", { count: 3 });
    expect(shallowRead).toHaveBeenCalledTimes(2);
    expect(readonlyRead).toHaveBeenCalledTimes(1);
  });
});

describe("20 / 5B raw 与 Proxy 身份", () => {
  it("混用 raw/Proxy key 只创建一项并触发同一个键依赖", () => {
    const key = {};
    const proxyKey = reactive(key);
    const raw = new Map<object, number>();
    const map = reactive(raw);
    const read = vi.fn(() => map.get(key));
    effect(read);
    map.set(proxyKey, 1);
    map.set(key, 2);
    expect(raw.size).toBe(1);
    expect(raw.has(key)).toBe(true);
    expect(map.get(proxyKey)).toBe(2);
    expect(read).toHaveBeenCalledTimes(3);
    expect(map.delete(proxyKey)).toBe(true);
    expect(map.has(key)).toBe(false);
  });

  it("代理前已存入的 Proxy key/member 也能通过 raw 查找", () => {
    const key = {};
    const proxyKey = reactive(key);
    const map = reactive(new Map([[proxyKey, 1]]));
    const set = reactive(new Set([proxyKey]));
    expect(map.get(key)).toBe(1);
    expect(set.has(key)).toBe(true);
    map.set(key, 2);
    set.add(key);
    expect(map.size).toBe(1);
    expect(set.size).toBe(1);
    expect(map.delete(key)).toBe(true);
    expect(set.delete(key)).toBe(true);
  });

  it("deep Map 存 raw value，shallow Map 保留传入的 value", () => {
    const value = {};
    const proxyValue = reactive(value);
    const raw = new Map<string, object>();
    const map = reactive(raw);
    const read = vi.fn(() => map.get("a"));
    effect(read);
    map.set("a", proxyValue);
    map.set("a", value);
    expect(raw.get("a")).toBe(value);
    expect(read).toHaveBeenCalledTimes(2);
    const shallowRaw = new Map<string, object>();
    shallowReactive(shallowRaw).set("a", proxyValue);
    expect(shallowRaw.get("a")).toBe(proxyValue);
  });
});

describe("20 / 6 与 deep watch 和调度衔接", () => {
  it("deep watch 读取 Map 的值且可以处理集合循环引用", () => {
    const value = { count: 0 };
    const raw = new Map<string, unknown>([["item", value]]);
    raw.set("self", raw);
    const map = reactive(raw);
    const callback = vi.fn();
    const stopWatch = watch(() => map, callback, { deep: true });
    reactive(value).count++;
    map.set("extra", 1);
    expect(callback).toHaveBeenCalledTimes(2);
    stopWatch();
    map.clear();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("deep watch 读取 Set 元素内部，并在删除后清理旧依赖", () => {
    const value = { count: 0 };
    const set = reactive(new Set([value]));
    const callback = vi.fn();
    watch(() => set, callback, { deep: true });
    reactive(value).count++;
    set.delete(value);
    reactive(value).count++;
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("集合 watch 的 pre 队列合并更新，stop 取消已排队任务", async () => {
    const map = reactive(new Map([["a", 0]]));
    const callback = vi.fn();
    const stopWatch = watch(() => map.get("a"), callback, { flush: "pre" });
    map.set("a", 1);
    map.set("a", 2);
    await nextTick();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.slice(0, 2)).toEqual([2, 0]);
    map.set("a", 3);
    stopWatch();
    await nextTick();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("20 / 7 最终边界", () => {
  it("NaN 重复写入不通知；0/-0 属于同一个集合键", () => {
    const map = reactive(new Map<number, number>([[NaN, NaN], [0, 1]]));
    const read = vi.fn(() => [map.get(NaN), map.get(0), map.size]);
    effect(read);
    map.set(NaN, NaN);
    expect(read).toHaveBeenCalledTimes(1);
    map.set(-0, 2);
    expect(read).toHaveBeenCalledTimes(2);
    expect(map.size).toBe(2);
  });

  it("新增集合路由不改变 markRaw 或普通对象/数组的行为", () => {
    const raw = markRaw(new Map([["a", 1]]));
    expect(reactive(raw)).toBe(raw);
    expect(raw.get("a")).toBe(1);
    const state = reactive({ count: 0 });
    const array = reactive([1]);
    const read = vi.fn(() => state.count + array.length);
    effect(read);
    state.count++;
    array.push(2);
    expect(read).toHaveBeenCalledTimes(3);
  });
});
