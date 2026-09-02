import { describe, expect, it } from "vitest";
import {
  effect,
  isReactive,
  isReadonly,
  markRaw,
  reactive,
  readonly,
  ref,
  shallowRef,
  stop,
  triggerRef,
  type Ref,
} from "../src";

describe("ref 对象转换、shallowRef 与 triggerRef：第十六章", () => {
  it("ref 会把普通对象值转换成 reactive Proxy", () => {
    const rawProfile = { name: "Ada" };
    const profile = ref(rawProfile);

    expect(profile.value).toBe(reactive(rawProfile));
    expect(isReactive(profile.value)).toBe(true);
  });

  it("ref 对象值的嵌套属性变化会触发 effect", () => {
    const profile = ref({ name: "Ada" });
    let observedName = "";
    let runs = 0;

    effect(() => {
      runs++;
      observedName = profile.value.name;
    });

    profile.value.name = "Grace";

    expect(observedName).toBe("Grace");
    expect(runs).toBe(2);
  });

  it("替换 ref 的对象值后会追踪新对象并清理旧对象依赖", () => {
    const firstRaw = { count: 0 };
    const counter = ref(firstRaw);
    const firstState = counter.value;
    let observedCount = -1;
    let runs = 0;

    effect(() => {
      runs++;
      observedCount = counter.value.count;
    });

    const replacement = { count: 1 };
    counter.value = replacement;
    counter.value.count = 2;
    firstState.count = 3;

    expect(isReactive(counter.value)).toBe(true);
    expect(observedCount).toBe(2);
    expect(runs).toBe(3);
  });

  it("对象 ref 再次赋入同一个 raw 时不会重复触发", () => {
    const rawProfile = { name: "Ada" };
    const profile = ref(rawProfile);
    let runs = 0;

    effect(() => {
      runs++;
      profile.value;
    });

    profile.value = rawProfile;

    expect(runs).toBe(1);
  });

  it("对象 ref 赋入同一 raw 的已有 Proxy 时不会重复触发", () => {
    const rawProfile = { name: "Ada" };
    const reactiveProfile = reactive(rawProfile);
    const profile = ref(rawProfile);
    let runs = 0;

    effect(() => {
      runs++;
      profile.value;
    });

    profile.value = reactiveProfile;

    expect(profile.value).toBe(reactiveProfile);
    expect(runs).toBe(1);
  });

  it("ref 的原始值功能继续支持基本类型", () => {
    const count = ref(1);
    let observedCount = 0;

    effect(() => {
      observedCount = count.value;
    });

    count.value = 2;

    expect(observedCount).toBe(2);
  });

  it("ref 会尊重 markRaw，不强制代理已标记对象", () => {
    const rawProfile = markRaw({ name: "Ada" });
    const profile = ref(rawProfile);

    expect(profile.value).toBe(rawProfile);
    expect(isReactive(profile.value)).toBe(false);
  });

  it("shallowRef 保留普通对象的 raw 身份", () => {
    const rawProfile = { name: "Ada" };
    const profile = shallowRef(rawProfile);

    expect(profile.value).toBe(rawProfile);
    expect(isReactive(profile.value)).toBe(false);
  });

  it("shallowRef 的嵌套属性变化不会自动触发 effect", () => {
    const profile = shallowRef({ name: "Ada" });
    let observedName = "";
    let runs = 0;

    effect(() => {
      runs++;
      observedName = profile.value.name;
    });

    profile.value.name = "Grace";

    expect(observedName).toBe("Ada");
    expect(runs).toBe(1);
  });

  it("替换 shallowRef.value 会触发 effect，但新对象仍保持 raw", () => {
    const profile = shallowRef({ name: "Ada" });
    let observedName = "";
    let runs = 0;

    effect(() => {
      runs++;
      observedName = profile.value.name;
    });

    const replacement = { name: "Grace" };
    profile.value = replacement;

    expect(profile.value).toBe(replacement);
    expect(isReactive(profile.value)).toBe(false);
    expect(observedName).toBe("Grace");
    expect(runs).toBe(2);
  });

  it("triggerRef 会在 shallowRef 嵌套值变化后手动通知 effect", () => {
    const rawProfile = { name: "Ada" };
    const profile = shallowRef(rawProfile);
    let observedName = "";
    let runs = 0;

    effect(() => {
      runs++;
      observedName = profile.value.name;
    });

    rawProfile.name = "Grace";
    triggerRef(profile);

    expect(observedName).toBe("Grace");
    expect(runs).toBe(2);
  });

  it("triggerRef 会沿用 effect 的 scheduler，而不是绕过调度器", () => {
    const profile = shallowRef({ name: "Ada" });
    let schedulerCalls = 0;

    effect(
      () => {
        profile.value;
      },
      {
        scheduler: () => {
          schedulerCalls++;
        },
      },
    );

    triggerRef(profile);

    expect(schedulerCalls).toBe(1);
  });

  it("triggerRef 也可以强制通知普通 ref 的订阅者", () => {
    const count = ref(1);
    let runs = 0;

    effect(() => {
      runs++;
      count.value;
    });

    triggerRef(count);

    expect(runs).toBe(2);
  });

  it("deep ref 会保留传入的 reactive 或 readonly Proxy 身份", () => {
    const reactiveState = reactive({ count: 1 });
    const readonlyView = readonly({ count: 2 });

    const reactiveReference = ref(reactiveState);
    const readonlyReference = ref(readonlyView);

    expect(reactiveReference.value).toBe(reactiveState);
    expect(readonlyReference.value).toBe(readonlyView);
    expect(isReactive(reactiveReference.value)).toBe(true);
    expect(isReadonly(readonlyReference.value)).toBe(true);
  });

  it("deep ref 会保留不可扩展对象的 raw 身份", () => {
    const frozenProfile = Object.freeze({ name: "Ada" });
    const profile = ref(frozenProfile);

    expect(profile.value).toBe(frozenProfile);
    expect(isReactive(profile.value)).toBe(false);
  });

  it("deep ref 会把数组及其对象元素转换成响应式访问", () => {
    const list = ref([{ count: 1 }]);
    let observedCount = 0;
    let runs = 0;

    effect(() => {
      runs++;
      observedCount = list.value[0].count;
    });

    list.value[0].count = 2;

    expect(isReactive(list.value)).toBe(true);
    expect(isReactive(list.value[0])).toBe(true);
    expect(observedCount).toBe(2);
    expect(runs).toBe(2);
  });

  it("shallowRef 会保留传入的 reactive Proxy，不会主动转回 raw", () => {
    const state = reactive({ count: 1 });
    const counter = shallowRef(state);
    let observedCount = 0;
    let runs = 0;

    effect(() => {
      runs++;
      observedCount = counter.value.count;
    });

    state.count = 2;

    expect(counter.value).toBe(state);
    expect(observedCount).toBe(2);
    expect(runs).toBe(2);
  });

  it("shallowRef 再次赋入同一个对象身份时不会重复触发", () => {
    const rawProfile = { name: "Ada" };
    const profile = shallowRef(rawProfile);
    let runs = 0;

    effect(() => {
      runs++;
      profile.value;
    });

    profile.value = rawProfile;

    expect(runs).toBe(1);
  });

  it("triggerRef 接收没有内部 dep 的结构化 Ref 时不会报错", () => {
    const customReference: Ref<number> = { value: 1 };

    expect(() => triggerRef(customReference)).not.toThrow();
  });

  it("effect 停止后，triggerRef 不会再次执行它", () => {
    const profile = shallowRef({ name: "Ada" });
    let runs = 0;

    const runner = effect(() => {
      runs++;
      profile.value;
    });

    stop(runner);
    triggerRef(profile);

    expect(runs).toBe(1);
  });
});
