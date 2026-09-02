import { trackEffect, triggerEffects, type Dep } from "./effect";
import { hasChanged, isObject } from "@mini-vue/shared";
import { reactive, toRaw } from "./reactive";

export interface Ref<T> {
  value: T;
}

type RefWithDep = Ref<unknown> & {
  readonly dep?: Dep;
};

/**
 * ref 的内部实现。
 * _rawValue 保存用于比较的原始身份，_value 保存 getter 对外返回的值。
 * dep 保存订阅当前 ref.value 的副作用对象。
 */
class RefImpl<T> implements Ref<T> {
  private _rawValue: T;
  private _value: T;
  readonly dep: Dep = new Set();
  private readonly isShallow: boolean;

  constructor(value: T, isShallow: boolean) {
    this.isShallow = isShallow;

    this._rawValue = this.isShallow ? value : toRaw(value);
    this._value = this.isShallow ? value : toReactive(value);
  }

  /** 值真正改变时先保存新值，再通知所有订阅者。 */
  set value(newValue: T) {
    const rawNewValue = this.isShallow ? newValue : toRaw(newValue);
    if (!hasChanged(this._rawValue, rawNewValue)) {
      return;
    }

    this._rawValue = rawNewValue;
    this._value = this.isShallow ? newValue : toReactive(newValue);

    triggerEffects(this.dep);
  }

  /** 读取值时收集当前正在执行的 effect。 */
  get value() {
    trackEffect(this.dep);
    return this._value;
  }
}

function toReactive<T>(value: T): T {
  if (isObject(value)) return reactive(value) as T;

  return value;
}

/**
 * 将普通值包装成带有 .value 属性的响应式引用。
 * 对外只暴露 Ref 接口，隐藏 RefImpl 的内部细节。
 */
export function ref<T>(value: T): Ref<T> {
  return new RefImpl(value, false);
}

/**
 * 创建只追踪 .value 替换、但不转换内部对象的浅层 ref。
 */
export function shallowRef<T>(value: T): Ref<T> {
  return new RefImpl(value, true);
}

/**
 * 在不修改 value 的情况下，手动通知 ref 已收集的订阅者。
 */
export function triggerRef(reference: Ref<unknown>): void {
  const dep = (reference as RefWithDep).dep;

  if (dep) triggerEffects(dep);
}
