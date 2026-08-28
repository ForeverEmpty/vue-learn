import { ReactiveEffect, trackEffect, triggerEffects, type Dep } from "./effect";

export interface ComputedRef<T> {
  readonly value: T;
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

  constructor(getter: () => T) {
    this.computedEffect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerEffects(this.dep)
      }
    });
  }

  get value(): T {
    trackEffect(this.dep)
    
    if (this._dirty) {
      this._value = this.computedEffect.run();
      this._dirty = false;
    }
    return this._value;
  }
}

export function computed<T>(getter: () => T): ComputedRef<T> {
  return new ComputedRefImpl(getter);
}
