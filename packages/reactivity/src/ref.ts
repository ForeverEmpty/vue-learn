import { getActiveEffect, type Dep } from "./effect";
import { hasChanged } from "@mini-vue/shared";

export interface Ref<T> {
  value: T;
}

/**
 * ref 的内部实现。
 * _value 保存实际值，dep 保存订阅当前 ref 的副作用对象。
 */
class RefImpl<T> implements Ref<T> {
  private _value: T;
  private readonly dep: Dep = new Set();

  constructor(value: T) {
    this._value = value;
  }

  /** 值真正改变时先保存新值，再通知所有订阅者。 */
  set value(newValue: T) {
    if (!hasChanged(this._value, newValue)) {
      return;
    }

    this._value = newValue;

    const _dep = new Set(this.dep);
    
    _dep.forEach((effect) => effect.run());
  }

  /** 读取值时收集当前正在执行的 effect。 */
  get value() {
    const effect = getActiveEffect();
    if (effect && !this.dep.has(effect)) {
      this.dep.add(effect);
      effect.deps.push(this.dep);
    }

    return this._value;
  }
}

/**
 * 将普通值包装成带有 .value 属性的响应式引用。
 * 对外只暴露 Ref 接口，隐藏 RefImpl 的内部细节。
 */
export function ref<T>(value: T): Ref<T> {
  return new RefImpl(value);
}
