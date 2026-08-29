import { afterEach, describe, expect, it, vi } from "vitest";
import {
  effect,
  isReactive,
  isReadonly,
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
  toRaw,
} from "../src";

type ConsoleTarget = {
  console: {
    warn: (...args: unknown[]) => void;
  };
};

function mockConsoleWarn() {
  const { console: consoleTarget } = globalThis as unknown as ConsoleTarget;
  return vi.spyOn(consoleTarget, "warn").mockImplementation(() => {});
}

describe("shallowReactive 与 shallowReadonly：第十四章", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shallowReactive 会代理根对象并保持 reactive 身份", () => {
    const raw = { count: 1 };
    const state = shallowReactive(raw);

    expect(state).not.toBe(raw);
    expect(isReactive(state)).toBe(true);
    expect(isReadonly(state)).toBe(false);
  });

  it("shallowReactive 不会转换嵌套对象", () => {
    const raw = { profile: { name: "Ada" } };
    const state = shallowReactive(raw);

    expect(state.profile).toBe(raw.profile);
    expect(isReactive(state.profile)).toBe(false);
  });

  it("替换 shallowReactive 的根层属性会触发 effect", () => {
    const state = shallowReactive({ profile: { name: "Ada" } });
    let observedProfile = state.profile;
    let runs = 0;

    effect(() => {
      runs++;
      observedProfile = state.profile;
    });

    const replacement = { name: "Grace" };
    state.profile = replacement;

    expect(observedProfile).toBe(replacement);
    expect(runs).toBe(2);
  });

  it("直接修改 shallowReactive 的嵌套属性不会触发 effect", () => {
    const state = shallowReactive({ profile: { name: "Ada" } });
    let observedName = "";
    let runs = 0;

    effect(() => {
      runs++;
      observedName = state.profile.name;
    });

    state.profile.name = "Grace";

    expect(observedName).toBe("Ada");
    expect(runs).toBe(1);
  });

  it("shallowReactive 的根层新增和删除仍参与结构依赖", () => {
    const state = shallowReactive<Record<string, number>>({ count: 1 });
    let keys: string[] = [];
    let runs = 0;

    effect(() => {
      runs++;
      keys = Object.keys(state);
    });

    state.extra = 2;
    delete state.count;

    expect(keys).toEqual(["extra"]);
    expect(runs).toBe(3);
  });

  it("同一个 raw 会复用同一个 shallowReactive 代理", () => {
    const raw = { count: 1 };

    expect(shallowReactive(raw)).toBe(shallowReactive(raw));
  });

  it("同一个 raw 的 shallowReactive 与 deep reactive 代理不同", () => {
    const raw = { count: 1 };

    expect(shallowReactive(raw)).not.toBe(reactive(raw));
  });

  it("shallowReadonly 会保护根对象并保持 readonly 身份", () => {
    const raw = { count: 1 };
    const view = shallowReadonly(raw);
    const warn = mockConsoleWarn();

    const didSet = Reflect.set(view, "count", 2);

    expect(isReadonly(view)).toBe(true);
    expect(didSet).toBe(true);
    expect(raw.count).toBe(1);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("shallowReadonly 的嵌套对象保持 raw 并且仍可修改", () => {
    const raw = { profile: { name: "Ada" } };
    const view = shallowReadonly(raw);
    const warn = mockConsoleWarn();

    view.profile.name = "Grace";

    expect(view.profile).toBe(raw.profile);
    expect(isReadonly(view.profile)).toBe(false);
    expect(raw.profile.name).toBe("Grace");
    expect(warn).not.toHaveBeenCalled();
  });

  it("shallowReadonly 会独立缓存且不复用 deep readonly 代理", () => {
    const raw = { count: 1 };
    const shallowView = shallowReadonly(raw);

    expect(shallowReadonly(raw)).toBe(shallowView);
    expect(shallowView).not.toBe(readonly(raw));
  });

  it("toRaw 能还原两种 shallow 代理", () => {
    const reactiveRaw = { count: 1 };
    const readonlyRaw = { count: 2 };

    expect(toRaw(shallowReactive(reactiveRaw))).toBe(reactiveRaw);
    expect(toRaw(shallowReadonly(readonlyRaw))).toBe(readonlyRaw);
  });

  it("shallowReactive 数组只代理数组本身，不代理数组元素", () => {
    const rawItem = { count: 1 };
    const raw = [rawItem];
    const list = shallowReactive(raw);
    let observedItem = list[0];
    let runs = 0;

    effect(() => {
      runs++;
      observedItem = list[0];
    });

    const replacement = { count: 2 };
    list[0] = replacement;

    expect(toRaw(list[0])).toBe(replacement);
    expect(list[0]).toBe(replacement);
    expect(observedItem).toBe(replacement);
    expect(runs).toBe(2);
  });

  it("shallowReadonly 数组保护索引，但不保护元素内部", () => {
    const rawItem = { count: 1 };
    const replacement = { count: 2 };
    const raw = [rawItem];
    const view = shallowReadonly(raw);
    const warn = mockConsoleWarn();

    const didSet = Reflect.set(view, 0, replacement);
    view[0].count = 3;

    expect(didSet).toBe(true);
    expect(raw[0]).toBe(rawItem);
    expect(view[0]).toBe(rawItem);
    expect(rawItem.count).toBe(3);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("从 raw 或 reactive 入口创建 shallowReadonly 会复用同一代理", () => {
    const raw = { count: 1 };
    const state = reactive(raw);

    expect(shallowReadonly(state)).toBe(shallowReadonly(raw));
  });

  it("对 shallowReadonly 调用 shallowReactive 不会移除只读保护", () => {
    const view = shallowReadonly({ count: 1 });
    const result = shallowReactive(view);

    expect(result).toBe(view);
    expect(isReadonly(result)).toBe(true);
    expect(isReactive(result)).toBe(false);
  });

  it("对 shallowReactive 调用 deep readonly 会得到深层只读代理", () => {
    const raw = { profile: { name: "Ada" } };
    const state = shallowReactive(raw);
    const view = readonly(state);

    expect(view).toBe(readonly(raw));
    expect(isReadonly(view.profile)).toBe(true);
  });

  it("shallowReactive 数组方法保留身份兼容与依赖暂停", () => {
    const rawItem = { count: 1 };
    const reactiveItem = reactive(rawItem);
    const addedItem = { count: 2 };
    const list = shallowReactive([rawItem]);
    let schedulerCalls = 0;

    expect(list.includes(rawItem)).toBe(true);
    expect(list.includes(reactiveItem)).toBe(true);

    effect(
      () => {
        list.push(addedItem);
      },
      {
        scheduler: () => {
          schedulerCalls++;
        },
      },
    );

    expect(list[1]).toBe(addedItem);
    expect(schedulerCalls).toBe(0);
  });

  it("shallowReadonly 拦截根层删除，但允许删除嵌套属性", () => {
    const raw = { profile: { name: "Ada" } };
    const view = shallowReadonly(raw);
    const warn = mockConsoleWarn();

    const didDeleteRoot = Reflect.deleteProperty(view, "profile");
    const didDeleteNested = Reflect.deleteProperty(view.profile, "name");

    expect(didDeleteRoot).toBe(true);
    expect(didDeleteNested).toBe(true);
    expect(raw).toHaveProperty("profile");
    expect(raw.profile).not.toHaveProperty("name");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("shallowReadonly 数组保护 length，但允许修改元素内部", () => {
    const rawItem = { count: 1 };
    const raw = [rawItem];
    const view = shallowReadonly(raw);
    const warn = mockConsoleWarn();

    const didSetLength = Reflect.set(view, "length", 0);
    view[0].count = 2;

    expect(didSetLength).toBe(true);
    expect(raw).toHaveLength(1);
    expect(rawItem.count).toBe(2);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("toRaw 对 shallow 代理可重复调用，嵌套对象始终保持 raw", () => {
    const raw = { profile: { name: "Ada" } };
    const state = shallowReactive(raw);
    const view = shallowReadonly(raw);

    expect(toRaw(toRaw(state))).toBe(raw);
    expect(toRaw(toRaw(view))).toBe(raw);
    expect(toRaw(state.profile)).toBe(raw.profile);
    expect(toRaw(view.profile)).toBe(raw.profile);
  });
});
