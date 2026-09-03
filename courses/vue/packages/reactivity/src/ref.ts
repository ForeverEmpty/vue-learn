import { trackEffect, triggerEffects, type Dep } from "./effect";
import { hasChanged, isObject } from "@mini-vue/shared";
import { reactive, toRaw } from "./reactive";
import { ReactiveFlags } from "./reactiveFlags";

export interface Ref<T> {
  value: T;
}

export type ToRef<T> = T extends Ref<unknown> ? T : Ref<T>;
export type ToRefs<T extends object> = {
  [Key in keyof T]: ToRef<T[Key]>;
};
export type ShallowUnwrapRef<T extends object> = {
  [Key in keyof T]: T[Key] extends Ref<infer Value> ? Value : T[Key];
};

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
  readonly [ReactiveFlags.IS_REF] = true;

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

class ObjectRefImpl<
  Target extends object,
  Key extends keyof Target,
> implements Ref<Target[Key]> {
  private readonly object: Target;
  private readonly key: Key;
  readonly [ReactiveFlags.IS_REF] = true;

  constructor(object: Target, key: Key) {
    this.object = object;
    this.key = key;
  }

  get value(): Target[Key] {
    return this.object[this.key];
  }

  set value(newValue: Target[Key]) {
    this.object[this.key] = newValue;
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

/** 通过内部 Symbol 标记判断一个值是否为 ref。 */
export function isRef(value: unknown): value is Ref<unknown> {
  if (!isObject(value)) return false;
  return Boolean(Reflect.get(value, ReactiveFlags.IS_REF));
}

/** ref 返回其 .value，普通值保持原样。 */
export function unref<T>(value: T | Ref<T>): T {
  if (isRef(value)) return value.value;

  return value as T;
}

/** 为对象的指定属性创建保持双向关联的 ref。 */
export function toRef<T extends object, Key extends keyof T>(
  object: T,
  key: Key,
): ToRef<T[Key]> {
  const existingValue = object[key];

  if (isRef(existingValue)) {
    return existingValue as ToRef<T[Key]>;
  }

  return new ObjectRefImpl(object, key) as unknown as ToRef<T[Key]>;
}

/** 将对象或数组的各个可枚举属性转换为关联 ref。 */
export function toRefs<T extends object>(object: T): ToRefs<T> {
  const result: object = Array.isArray(object) ? new Array(object.length) : {};

  for (const key of Object.keys(object)) {
    Reflect.set(result, key, toRef(object, key as keyof T));
  }

  return result as ToRefs<T>;
}

/** 浅层代理对象属性：读取时解包 ref，写入时按新旧值类型决定更新或替换。 */
export function proxyRefs<T extends object>(
  objectWithRefs: T,
): ShallowUnwrapRef<T> {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);

      return unref(value);
    },

    set(target, key, newValue, receiver) {
      const oldValue = Reflect.get(target, key, receiver);

      if (isRef(oldValue) && !isRef(newValue)) {
        oldValue.value = newValue;
        return true;
      }

      return Reflect.set(target, key, newValue, receiver);
    },
  }) as ShallowUnwrapRef<T>;
}
