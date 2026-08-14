export type EffectFn = () => void;
export type Dep = Set<ReactiveEffect>;

/** 当前正在执行、可以被 ref 收集的副作用对象。 */
let activeEffect: ReactiveEffect | undefined;

/**
 * 供响应式值在 getter 中读取当前副作用。
 * effect 外部读取响应式值时返回 undefined，因此不会产生错误订阅。
 */
export function getActiveEffect(): ReactiveEffect | undefined {
  return activeEffect;
}

/** 包装副作用函数，并记录该副作用加入过的所有依赖集合。 */
export class ReactiveEffect {
  private readonly fn: EffectFn;
  readonly deps: Dep[] = [];

  constructor(fn: EffectFn) {
    this.fn = fn;
  }

  run(): void {
    cleanupEffect(this);

    activeEffect = this;
    this.fn();
    activeEffect = undefined;
  }
}

function cleanupEffect(reactiveEffect: ReactiveEffect): void {
  reactiveEffect.deps.forEach((dep) => dep.delete(reactiveEffect));

  reactiveEffect.deps.length = 0;
}

/**
 * 注册并立即执行一个副作用函数。
 * 执行期间通过 activeEffect 暴露当前函数，使它读取到的 ref 能够收集依赖。
 */
export function effect(fn: EffectFn): void {
  const reactiveEffect = new ReactiveEffect(fn);
  reactiveEffect.run();
}
