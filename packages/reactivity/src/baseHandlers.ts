import { hasChanged } from "@mini-vue/shared";
import { track, trigger } from "./effect";

export const mutableHandlers: ProxyHandler<object> = {
  /** 转发属性读取，并按原对象与属性名收集当前 effect。 */
  get(target, key, receiver) {
    const result = Reflect.get(target, key, receiver);

    track(target, key);

    return result;
  },
  /** 写入成功且值真正改变时，触发当前属性的订阅者。 */
  set(target, key, newValue, receiver) {
    const oldValue = Reflect.get(target, key, receiver);
    const didSet = Reflect.set(target, key, newValue, receiver);

    if (didSet && hasChanged(oldValue, newValue)) {
      trigger(target, key);
    }
    
    return didSet;
  },
};
