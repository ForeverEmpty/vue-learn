export type EffectFn = () => void;
export type Dep = Set<ReactiveEffect>;

/** 当前正在执行、可以被响应式值收集的副作用对象。 */
let activeEffect: ReactiveEffect | undefined;
const targetMap = new WeakMap<object, Map<PropertyKey, Dep>>();

/** 包装副作用函数，并记录该副作用加入过的所有依赖集合。 */
export class ReactiveEffect {
  private readonly fn: EffectFn;
  readonly deps: Dep[] = [];

  constructor(fn: EffectFn) {
    this.fn = fn;
  }

  run(): void {
    cleanupEffect(this);

    const parentEffect = activeEffect;
    activeEffect = this;

    try {
      this.fn();
    } finally {
      activeEffect = parentEffect;
    }
  }
}

function cleanupEffect(reactiveEffect: ReactiveEffect): void {
  reactiveEffect.deps.forEach((dep) => dep.delete(reactiveEffect));

  reactiveEffect.deps.length = 0;
}

export function trackEffect(dep: Dep): void {
  if (activeEffect && !dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

export function triggerEffects(dep: Dep): void {
  const _dep = new Set(dep);
  _dep.forEach((effect) => effect.run());
}

export function track(target: object, key: PropertyKey): void {
  if (!activeEffect) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  trackEffect(dep);
}

export function trigger(target: object, key: PropertyKey): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const dep = depsMap.get(key);
  if (!dep) return;

  triggerEffects(dep);
}

/**
 * 注册并立即执行一个副作用函数。
 * 执行期间通过 activeEffect 暴露当前函数，使它读取到的 ref 能够收集依赖。
 */
export function effect(fn: EffectFn): void {
  const reactiveEffect = new ReactiveEffect(fn);
  reactiveEffect.run();
}
