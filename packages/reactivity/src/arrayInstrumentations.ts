import { pauseTracking, resetTracking, track } from "./effect";
import { toRaw } from "./reactive";

type SearchMethod = "includes" | "indexOf" | "lastIndexOf";
type MutationMethod = "push" | "pop" | "shift" | "unshift" | "splice";

/** 数组专用方法的统一函数类型；包装方法运行时的 this 是响应式数组 Proxy。 */
export type ArrayMethod = (this: unknown[], ...args: unknown[]) => unknown;

function searchArray(
  array: unknown[],
  method: SearchMethod,
  args: unknown[],
): unknown {
  const rawArray = toRaw(array);

  for (let index = 0; index < rawArray.length; index++) {
    track(rawArray, String(index));
  }

  track(rawArray, "length");

  const rawArgs = args.map((argument) => toRaw(argument));

  const nativeMethod = Array.prototype[method] as ArrayMethod;

  return Reflect.apply(nativeMethod, rawArray, rawArgs);
}

function mutateArray(
  array: unknown[],
  method: MutationMethod,
  args: unknown[],
): unknown {
  const nativeMethod = Array.prototype[method];

  pauseTracking();

  try {
    return Reflect.apply(nativeMethod, array, args);
  } finally {
    resetTracking();
  }
}

/**
 * 第十二章检查点 2B：
 * 1. 添加搜索方法需要的导入与 SearchMethod 类型。
 * 2. 实现共用的 searchArray 函数。
 * 3. 在此对象中添加 includes、indexOf 和 lastIndexOf 包装方法。
 */
export const arrayInstrumentations: Record<string, ArrayMethod> = {
  includes(this: unknown[], ...args: unknown[]) {
    return searchArray(this, "includes", args);
  },

  indexOf(this: unknown[], ...args: unknown[]) {
    return searchArray(this, "indexOf", args);
  },

  lastIndexOf(this: unknown[], ...args: unknown[]) {
    return searchArray(this, "lastIndexOf", args);
  },

  push(this: unknown[], ...args: unknown[]) {
    return mutateArray(this, "push", args);
  },

  pop(this: unknown[], ...args: unknown[]) {
    return mutateArray(this, "pop", args);
  },

  shift(this: unknown[], ...args: unknown[]) {
    return mutateArray(this, "shift", args);
  },

  unshift(this: unknown[], ...args: unknown[]) {
    return mutateArray(this, "unshift", args);
  },

  splice(this: unknown[], ...args: unknown[]) {
    return mutateArray(this, "splice", args);
  },
};
