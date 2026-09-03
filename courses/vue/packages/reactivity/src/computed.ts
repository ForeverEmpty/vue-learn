import {
  ReactiveEffect,
  trackEffect,
  triggerEffects,
  type Dep,
} from "./effect";
import { ReactiveFlags } from "./reactiveFlags";
import type { Ref } from "./ref";

export interface ComputedRef<T> {
  readonly value: T;
}

export interface WritableComputedRef<T> extends Ref<T> {}

export interface WritableComputedOptions<T> {
  get: () => T;
  set: (value: T) => void;
}

/**
 * 缓存 getter 的计算结果，并通过内部 effect 追踪源依赖。
 * 源依赖变化时只标记缓存失效，并通知读取 computed 的消费者。
 */
class ComputedRefImpl<T> implements ComputedRef<T> {
  private readonly computedEffect: ReactiveEffect<T>;
  private _value!: T;
  private _dirty: boolean = true;
  private readonly dep: Dep = new Set();
  private readonly setter?: (value: T) => void;
  readonly [ReactiveFlags.IS_REF] = true;

  constructor(getter: () => T, setter?: (value: T) => void) {
    this.setter = setter;

    this.computedEffect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerEffects(this.dep);
      }
    });
  }

  set value(newValue: T) {
    this.setter?.(newValue);
  }

  get value(): T {
    trackEffect(this.dep);

    if (this._dirty) {
      this._value = this.computedEffect.run();
      this._dirty = false;
    }
    return this._value;
  }
}

export function computed<T>(getter: () => T): ComputedRef<T>;
export function computed<T>(
  options: WritableComputedOptions<T>,
): WritableComputedRef<T>;
export function computed<T>(
  source: (() => T) | WritableComputedOptions<T>,
): ComputedRef<T> | WritableComputedRef<T> {
  const getter = typeof source === "function" ? source : source.get;
  const setter = typeof source === "function" ? undefined : source.set;

  return new ComputedRefImpl(getter, setter);
}
