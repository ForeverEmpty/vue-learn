import { describe, expect, it } from "vitest";
import {
  effect,
  isProxy,
  isReactive,
  markRaw,
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
  toRaw,
} from "../src";
import { ReactiveFlags } from "../src/reactiveFlags";

describe("markRaw 与跳过代理：第十五章", () => {
  it("markRaw 返回传入的原对象", () => {
    const raw = { count: 1 };

    expect(markRaw(raw)).toBe(raw);
  });

  it("markRaw 使用不可枚举的内部标记，并且可以重复调用", () => {
    const raw = { count: 1 };

    markRaw(raw);
    markRaw(raw);

    const descriptor = Object.getOwnPropertyDescriptor(raw, ReactiveFlags.SKIP);

    expect(Reflect.get(raw, ReactiveFlags.SKIP)).toBe(true);
    expect(descriptor?.enumerable).toBe(false);
    expect(Object.keys(raw)).toEqual(["count"]);
  });

  it("reactive 不会代理被 markRaw 标记的根对象", () => {
    const raw = markRaw({ count: 1 });
    const result = reactive(raw);

    expect(result).toBe(raw);
    expect(isProxy(result)).toBe(false);
  });

  it("四种代理工厂都会跳过被标记的对象", () => {
    const reactiveRaw = markRaw({ count: 1 });
    const readonlyRaw = markRaw({ count: 2 });
    const shallowReactiveRaw = markRaw({ count: 3 });
    const shallowReadonlyRaw = markRaw({ count: 4 });

    expect(reactive(reactiveRaw)).toBe(reactiveRaw);
    expect(readonly(readonlyRaw)).toBe(readonlyRaw);
    expect(shallowReactive(shallowReactiveRaw)).toBe(shallowReactiveRaw);
    expect(shallowReadonly(shallowReadonlyRaw)).toBe(shallowReadonlyRaw);
  });

  it("深层 reactive 读取被标记的嵌套对象时仍保持 raw", () => {
    const rawProfile = markRaw({ name: "Ada" });
    const state = reactive({ profile: rawProfile });
    let observedName = "";
    let runs = 0;

    effect(() => {
      runs++;
      observedName = state.profile.name;
    });

    state.profile.name = "Grace";

    expect(state.profile).toBe(rawProfile);
    expect(isReactive(state.profile)).toBe(false);
    expect(observedName).toBe("Ada");
    expect(runs).toBe(1);
  });

  it("响应式数组中的标记对象保持 raw 身份", () => {
    const rawItem = markRaw({ id: 1 });
    const list = reactive([rawItem]);

    expect(list[0]).toBe(rawItem);
    expect(isReactive(list[0])).toBe(false);
    expect(list.includes(rawItem)).toBe(true);
  });

  it("所有代理工厂都会跳过不可扩展对象", () => {
    const reactiveRaw = Object.preventExtensions({ count: 1 });
    const readonlyRaw = Object.seal({ count: 2 });
    const shallowReactiveRaw = Object.freeze({ count: 3 });
    const shallowReadonlyRaw = Object.preventExtensions({ count: 4 });

    expect(reactive(reactiveRaw)).toBe(reactiveRaw);
    expect(readonly(readonlyRaw)).toBe(readonlyRaw);
    expect(shallowReactive(shallowReactiveRaw)).toBe(shallowReactiveRaw);
    expect(shallowReadonly(shallowReadonlyRaw)).toBe(shallowReadonlyRaw);
  });

  it("普通可扩展对象仍会按照所选工厂创建代理", () => {
    expect(isReactive(reactive({ count: 1 }))).toBe(true);
    expect(isProxy(readonly({ count: 2 }))).toBe(true);
    expect(isReactive(shallowReactive({ count: 3 }))).toBe(true);
    expect(isProxy(shallowReadonly({ count: 4 }))).toBe(true);
  });

  it("对已有代理调用 markRaw 不会移除已经创建的代理", () => {
    const raw = { count: 1 };
    const state = reactive(raw);
    const result = markRaw(state);

    expect(result).toBe(state);
    expect(isReactive(result)).toBe(true);
    expect(toRaw(result)).toBe(raw);
  });

  it("给 raw 添加内部标记不会触发 Object.keys 的结构依赖", () => {
    const raw = { count: 1 };
    const state = reactive(raw);
    let keys: string[] = [];
    let runs = 0;

    effect(() => {
      runs++;
      keys = Object.keys(state);
    });

    markRaw(raw);

    expect(keys).toEqual(["count"]);
    expect(runs).toBe(1);
  });

  it("SKIP 描述符不可写但可以删除", () => {
    const raw = markRaw({ count: 1 });
    const descriptor = Object.getOwnPropertyDescriptor(raw, ReactiveFlags.SKIP);

    expect(descriptor).toMatchObject({
      value: true,
      writable: false,
      enumerable: false,
      configurable: true,
    });
    expect(Reflect.set(raw, ReactiveFlags.SKIP, false)).toBe(false);
    expect(Reflect.deleteProperty(raw, ReactiveFlags.SKIP)).toBe(true);
    expect(Reflect.get(raw, ReactiveFlags.SKIP)).toBeUndefined();
    expect(isReactive(reactive(raw))).toBe(true);
  });

  it("从原型继承到 SKIP 时也会跳过代理，但不会新增自有标记", () => {
    const markedPrototype = markRaw({ kind: "prototype" });
    const child = Object.create(markedPrototype) as { count?: number };
    child.count = 1;

    expect(Reflect.get(child, ReactiveFlags.SKIP)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(child, ReactiveFlags.SKIP)).toBe(false);
    expect(reactive(child)).toBe(child);
  });

  it("markRaw 只标记当前对象，不会递归标记嵌套对象", () => {
    const nestedRaw = { count: 1 };
    const markedRoot = markRaw({ nested: nestedRaw });

    expect(reactive(markedRoot)).toBe(markedRoot);
    expect(Reflect.get(nestedRaw, ReactiveFlags.SKIP)).toBeUndefined();
    expect(reactive(nestedRaw)).not.toBe(nestedRaw);
  });

  it("raw 在已有代理后被标记时，已有代理仍有效，后续工厂调用则返回 raw", () => {
    const raw = { count: 1 };
    const existingState = reactive(raw);

    markRaw(raw);

    expect(isReactive(existingState)).toBe(true);
    expect(toRaw(existingState)).toBe(raw);
    expect(reactive(raw)).toBe(raw);
  });

  it("对已有代理调用 markRaw 会把标记转发到 raw，但不会改变当前变量身份", () => {
    const raw = { count: 1 };
    const existingState = reactive(raw);

    const markedResult = markRaw(existingState);

    expect(markedResult).toBe(existingState);
    expect(isReactive(markedResult)).toBe(true);
    expect(Reflect.get(raw, ReactiveFlags.SKIP)).toBe(true);
    expect(reactive(raw)).toBe(raw);
  });

  it("不可扩展数组也会被四种工厂跳过", () => {
    const reactiveList = Object.preventExtensions([{ id: 1 }]);
    const readonlyList = Object.seal([{ id: 2 }]);
    const shallowReactiveList = Object.freeze([{ id: 3 }]);
    const shallowReadonlyList = Object.preventExtensions([{ id: 4 }]);

    expect(reactive(reactiveList)).toBe(reactiveList);
    expect(readonly(readonlyList)).toBe(readonlyList);
    expect(shallowReactive(shallowReactiveList)).toBe(shallowReactiveList);
    expect(shallowReadonly(shallowReadonlyList)).toBe(shallowReadonlyList);
  });

  it("markRaw 接收冻结对象时不会尝试定义属性或抛出异常", () => {
    const frozenRaw = Object.freeze({ count: 1 });

    expect(() => markRaw(frozenRaw)).not.toThrow();
    expect(markRaw(frozenRaw)).toBe(frozenRaw);
    expect(Object.getOwnPropertyDescriptor(frozenRaw, ReactiveFlags.SKIP)).toBeUndefined();
    expect(reactive(frozenRaw)).toBe(frozenRaw);
  });
});
