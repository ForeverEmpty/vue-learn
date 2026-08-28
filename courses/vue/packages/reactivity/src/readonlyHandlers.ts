import { isObject } from "@mini-vue/shared";
import { readonly } from "./reactive";
import { ReactiveFlags } from "./reactiveFlags";

/** 提供深层只读访问，并拦截通过只读代理进行的写入与删除。 */
export const readonlyHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return false;
    if (key === ReactiveFlags.IS_READONLY) return true;

    const result = Reflect.get(target, key, receiver);

    if (isObject(result)) return readonly(result);

    return result;
  },

  set(_target, key, _newValue, _receiver) {
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
    );

    return true;
  },

  deleteProperty(_target, key) {
    console.warn(
      `Delete operation on key "${String(key)}" failed: target is readonly.`,
    );

    return true;
  },
};
