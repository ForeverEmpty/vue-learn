export type EffectFn = () => void;

/** 当前正在执行、可以被 ref 收集的副作用函数。 */
let activeEffect: EffectFn | undefined;

/**
 * 供响应式值在 getter 中读取当前副作用。
 * effect 外部读取响应式值时返回 undefined，因此不会产生错误订阅。
 */
export function getActiveEffect(): EffectFn | undefined {
  return activeEffect;
}

/**
 * 注册并立即执行一个副作用函数。
 * 执行期间通过 activeEffect 暴露当前函数，使它读取到的 ref 能够收集依赖。
 */
export function effect(fn: EffectFn): void {
  activeEffect = fn;
  fn();
  activeEffect = undefined;
}
