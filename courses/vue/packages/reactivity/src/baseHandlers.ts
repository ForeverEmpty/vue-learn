import { hasChanged, isObject } from "@mini-vue/shared";
import { track, trigger, ITERATE_KEY, type TriggerOpType } from "./effect";
import { reactive } from "./reactive";
import { arrayInstrumentations } from "./arrayInstrumentations";

export const mutableHandlers: ProxyHandler<object> = {
  /** 转发属性读取，并按原对象与属性名收集当前 effect。 */
  get(target, key, receiver) {
    const isArrayTarget = Array.isArray(target);

    const hasArrayInstrumentation =
      isArrayTarget &&
      Object.prototype.hasOwnProperty.call(arrayInstrumentations, key);

    if (hasArrayInstrumentation) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    const result = Reflect.get(target, key, receiver);

    track(target, key);
    if (isObject(result)) return reactive(result);

    return result;
  },
  /** 写入成功且值真正改变时，触发当前属性的订阅者。 */
  set(target, key, newValue, receiver) {
    const isArrayTarget = Array.isArray(target);
    const oldLength = isArrayTarget ? target.length : undefined;
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
    const oldValue = Reflect.get(target, key, receiver);
    const didSet = Reflect.set(target, key, newValue, receiver);
    const operationType: TriggerOpType = hadKey ? "set" : "add";

    if (!didSet) return didSet;

    if (!hadKey) {
      trigger(target, key, operationType, oldLength);
    } else if (hasChanged(oldValue, newValue)) {
      trigger(target, key, operationType, oldLength);
    }

    return didSet;
  },

  has(target, key) {
    const result = Reflect.has(target, key);

    track(target, key);

    return result;
  },

  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
    const didDelete = Reflect.deleteProperty(target, key);

    if (hadKey && didDelete) {
      trigger(target, key, "delete");
    }

    return didDelete;
  },

  ownKeys(target) {
    track(target, ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
};
