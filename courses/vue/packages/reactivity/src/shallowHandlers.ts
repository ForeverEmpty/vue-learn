import { arrayInstrumentations } from "./arrayInstrumentations";
import { mutableHandlers } from "./baseHandlers";
import { track } from "./effect";
import { ReactiveFlags } from "./reactiveFlags";
import { readonlyHandlers } from "./readonlyHandlers";

/** 复用 mutable 的根层写入与结构 trap，但读取结果不再深层转换。 */
export const shallowReactiveHandlers: ProxyHandler<object> = {
  ...mutableHandlers,
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true;
    if (key === ReactiveFlags.IS_READONLY) return false;

    const isArrayTarget = Array.isArray(target);
    const hasArrayInstrumentation =
      isArrayTarget &&
      Object.prototype.hasOwnProperty.call(arrayInstrumentations, key);

    if (hasArrayInstrumentation) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }

    const result = Reflect.get(target, key, receiver);

    track(target, key);

    return result;
  },
};
/** 复用 readonly 的根层修改拦截，但读取结果保持为 raw。 */
export const shallowReadonlyHandlers: ProxyHandler<object> = {
  ...readonlyHandlers,

  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return false;
    if (key === ReactiveFlags.IS_READONLY) return true;

    const result = Reflect.get(target, key, receiver);

    return result;
  },
};
