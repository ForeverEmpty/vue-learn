import { describe, expect, it } from "vitest";
import {
  computed,
  effect,
  isRef,
  proxyRefs,
  reactive,
  ref,
  shallowRef,
  toRef,
  toRefs,
  unref,
} from "../src";

describe("ref 工具与可写 computed：第十七章", () => {
  it("isRef 能识别 ref，并拒绝普通值", () => {
    expect(isRef(ref(1))).toBe(true);
    expect(isRef(1)).toBe(false);
    expect(isRef({ value: 1 })).toBe(false);
  });

  it("isRef 能识别 shallowRef 和 computed", () => {
    expect(isRef(shallowRef({ count: 1 }))).toBe(true);
    expect(isRef(computed(() => 1))).toBe(true);
  });

  it("unref 对 ref 返回 value", () => {
    expect(unref(ref("Ada"))).toBe("Ada");
  });

  it("unref 对普通值原样返回", () => {
    const raw = { name: "Ada" };

    expect(unref(1)).toBe(1);
    expect(unref(raw)).toBe(raw);
  });

  it("unref 可以读取 computed 的 value", () => {
    const count = ref(1);
    const doubled = computed(() => count.value * 2);

    expect(unref(doubled)).toBe(2);
  });

  it("toRef 初次读取对象属性值", () => {
    const state = reactive({ count: 1 });
    const count = toRef(state, "count");

    expect(count.value).toBe(1);
  });

  it("toRef 与源对象属性保持双向同步", () => {
    const state = reactive({ count: 1 });
    const count = toRef(state, "count");

    state.count = 2;
    expect(count.value).toBe(2);

    count.value = 3;
    expect(state.count).toBe(3);
  });

  it("toRef 遇到已经是 ref 的属性时复用原 ref", () => {
    const existing = ref(1);
    const source = { count: existing };

    expect(toRef(source, "count") === existing).toBe(true);
  });

  it("toRefs 为对象的每个可枚举属性创建关联 ref", () => {
    const state = reactive({ name: "Ada", age: 20 });
    const references = toRefs(state);

    expect(references.name.value).toBe("Ada");
    references.age.value = 21;
    expect(state.age).toBe(21);
    state.name = "Grace";
    expect(references.name.value).toBe("Grace");
  });

  it("toRefs 处理数组时仍返回数组形状并保持索引同步", () => {
    const list = reactive(["A", "B"]);
    const references = toRefs(list);

    expect(Array.isArray(references)).toBe(true);
    expect(references[0].value).toBe("A");
    references[1].value = "C";
    expect(list[1]).toBe("C");
  });

  it("proxyRefs 读取时自动解包 ref，普通值保持原样", () => {
    const user = proxyRefs({
      name: ref("Ada"),
      age: 20,
    });

    expect(user.name).toBe("Ada");
    expect(user.age).toBe(20);
  });

  it("proxyRefs 给旧 ref 属性赋普通值时会更新 ref.value", () => {
    const name = ref("Ada");
    const source = { name };
    const user = proxyRefs(source);

    user.name = "Grace";

    expect(name.value).toBe("Grace");
    expect(source.name).toBe(name);
  });

  it("proxyRefs 给属性赋入新 ref 时会替换旧 ref", () => {
    const oldName = ref("Ada");
    const newName = ref("Grace");
    const source = { name: oldName };
    const user = proxyRefs(source);

    Reflect.set(user, "name", newName);

    expect(source.name).toBe(newName);
    expect(user.name).toBe("Grace");
  });

  it("可写 computed 的 setter 能反向更新源状态", () => {
    const count = ref(1);
    const plusOne = computed({
      get: () => count.value + 1,
      set: (value: number) => {
        count.value = value - 1;
      },
    });

    expect(plusOne.value).toBe(2);

    const didSet = Reflect.set(plusOne, "value", 5);

    expect(didSet).toBe(true);
    expect(count.value).toBe(4);
    expect(plusOne.value).toBe(5);
  });

  it("通过可写 computed 更新源状态时会通知读取它的 effect", () => {
    const count = ref(1);
    const plusOne = computed({
      get: () => count.value + 1,
      set: (value: number) => {
        count.value = value - 1;
      },
    });
    let observedValue = 0;
    let runs = 0;

    effect(() => {
      runs++;
      observedValue = plusOne.value;
    });

    Reflect.set(plusOne, "value", 6);

    expect(observedValue).toBe(6);
    expect(runs).toBe(2);
  });

  it("isRef 与 unref 能正确处理 ref 中保存的假值", () => {
    const values = [0, "", false, null, undefined] as const;

    for (const value of values) {
      const reference = ref(value);

      expect(isRef(reference)).toBe(true);
      expect(unref(reference)).toBe(value);
    }
  });

  it("toRef 支持 Symbol 属性并保持双向关联", () => {
    const scoreKey = Symbol("score");
    const state = reactive({ [scoreKey]: 1 });
    const score = toRef(state, scoreKey);

    score.value = 2;
    expect(state[scoreKey]).toBe(2);

    state[scoreKey] = 3;
    expect(score.value).toBe(3);
  });

  it("toRefs 处理稀疏数组时会保留原来的空位", () => {
    const list = reactive(new Array<string>(3));
    list[1] = "B";

    const references = toRefs(list);

    expect(references).toHaveLength(3);
    expect(0 in references).toBe(false);
    expect(1 in references).toBe(true);
    expect(2 in references).toBe(false);
    expect(references[1].value).toBe("B");
  });

  it("proxyRefs 能用新 ref 替换原来的普通属性", () => {
    const source: { count: number | ReturnType<typeof ref<number>> } = {
      count: 1,
    };
    const state = proxyRefs(source);
    const replacement = ref(2);

    const didSet = Reflect.set(state, "count", replacement);

    expect(didSet).toBe(true);
    expect(source.count).toBe(replacement);
    expect(state.count).toBe(2);
  });

  it("proxyRefs 解包读取与写入普通值时会保持 effect 响应", () => {
    const name = ref("Ada");
    const user = proxyRefs({ name });
    let observedName = "";
    let runs = 0;

    effect(() => {
      runs++;
      observedName = user.name;
    });

    user.name = "Grace";

    expect(observedName).toBe("Grace");
    expect(runs).toBe(2);
  });

  it("getter-only computed 的运行时写入不会改变计算结果", () => {
    const count = ref(1);
    const doubled = computed(() => count.value * 2);

    expect(doubled.value).toBe(2);
    expect(Reflect.set(doubled, "value", 100)).toBe(true);
    expect(count.value).toBe(1);
    expect(doubled.value).toBe(2);
  });

  it("可写 computed 保留缓存，写入相同源值时不会使缓存失效", () => {
    const count = ref(1);
    let getterRuns = 0;
    const plusOne = computed({
      get: () => {
        getterRuns++;
        return count.value + 1;
      },
      set: (value: number) => {
        count.value = value - 1;
      },
    });

    expect(plusOne.value).toBe(2);
    expect(plusOne.value).toBe(2);
    expect(getterRuns).toBe(1);

    plusOne.value = 2;
    expect(getterRuns).toBe(1);
    expect(plusOne.value).toBe(2);
    expect(getterRuns).toBe(1);

    plusOne.value = 3;
    expect(getterRuns).toBe(1);
    expect(plusOne.value).toBe(3);
    expect(getterRuns).toBe(2);
  });

  it("可写 computed 的源状态变化会沿用消费者 effect 的 scheduler", () => {
    const count = ref(1);
    const plusOne = computed({
      get: () => count.value + 1,
      set: (value: number) => {
        count.value = value - 1;
      },
    });
    let observedValue = 0;
    let schedulerCalls = 0;

    const runner = effect(
      () => {
        observedValue = plusOne.value;
      },
      {
        scheduler: () => {
          schedulerCalls++;
        },
      },
    );

    plusOne.value = 3;

    expect(schedulerCalls).toBe(1);
    expect(observedValue).toBe(2);

    runner();
    expect(observedValue).toBe(3);
  });
});
