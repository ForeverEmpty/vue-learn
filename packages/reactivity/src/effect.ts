import { isArrayIndex } from "@mini-vue/shared";

export type EffectFn<T = void> = () => T;
export type EffectScheduler = () => void;
export interface EffectOptions {
  scheduler?: EffectScheduler;
}
export type EffectRunner = (() => void) & {
  effect: ReactiveEffect<unknown>;
};

export type Dep = Set<ReactiveEffect<unknown>>;

export type TriggerOpType = "add" | "set" | "delete";

/** 当前正在执行、可以被响应式值收集的副作用对象。 */
let activeEffect: ReactiveEffect<unknown> | undefined;
const targetMap = new WeakMap<object, Map<PropertyKey, Dep>>();
let shouldTrack = true;
const trackStack: boolean[] = [];

export const ITERATE_KEY = Symbol("iterate");

/** 包装副作用函数，并记录该副作用加入过的所有依赖集合。 */
export class ReactiveEffect<T = void> {
  private readonly fn: EffectFn<T>;
  readonly scheduler?: EffectScheduler;
  readonly deps: Dep[] = [];
  private active = true;

  constructor(fn: EffectFn<T>, scheduler?: EffectScheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
  }

  run(): T {
    if (!this.active) return this.fn();

    cleanupEffect(this);

    const parentEffect = activeEffect;
    const previousShouldTrack = shouldTrack;

    activeEffect = this;
    shouldTrack = true;

    try {
      return this.fn();
    } finally {
      activeEffect = parentEffect;
      shouldTrack = previousShouldTrack;
    }
  }

  /** 停止自动订阅，清理当前 effect 加入过的全部 dep。 */
  stop(): void {
    if (!this.active) return;

    cleanupEffect(this);
    this.active = false;
  }
}

export function pauseTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

export function resetTracking(): void {
  const lastShouldTrack = trackStack.pop();

  shouldTrack = lastShouldTrack ?? true;
}

function cleanupEffect(reactiveEffect: ReactiveEffect<unknown>): void {
  reactiveEffect.deps.forEach((dep) => dep.delete(reactiveEffect));

  reactiveEffect.deps.length = 0;
}

export function trackEffect(dep: Dep): void {
  if (!shouldTrack) return;

  if (activeEffect && !dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

export function triggerEffects(dep: Dep): void {
  const _dep = new Set(dep);
  _dep.forEach((effect) => {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  });
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

export function trigger(
  target: object,
  key: PropertyKey,
  type: TriggerOpType,
  oldLength?: number,
): void {
  const shouldTriggerLength =
    Array.isArray(target) &&
    type === "add" &&
    isArrayIndex(key) &&
    oldLength !== undefined &&
    Number(key) >= oldLength;

  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effectsToRun: Dep = new Set();

  const dep = depsMap.get(key);

  dep?.forEach((effect) => {
    effectsToRun.add(effect);
  });

  if (shouldTriggerLength) {
    const lengthDep = depsMap.get("length");

    lengthDep?.forEach((effect) => {
      effectsToRun.add(effect);
    });
  }

  if (Array.isArray(target) && key === "length" && oldLength !== undefined) {
    const newLength = target.length;

    if (newLength < oldLength) {
      depsMap.forEach((indexDep, depKey) => {
        const isRemovedIndex =
          isArrayIndex(depKey) && Number(depKey) >= newLength;

        if (isRemovedIndex) {
          indexDep.forEach((effect) => {
            effectsToRun.add(effect);
          });
        }
      });

      const iterateDep = depsMap.get(ITERATE_KEY);

      iterateDep?.forEach((effect) => {
        effectsToRun.add(effect);
      });
    }
  }

  if (type === "add" || type === "delete") {
    const iterateDep = depsMap.get(ITERATE_KEY);

    iterateDep?.forEach((effect) => {
      effectsToRun.add(effect);
    });
  }

  triggerEffects(effectsToRun);
}

/**
 * 注册并立即执行一个副作用函数。
 * 执行期间通过 activeEffect 暴露当前函数，使它读取到的 ref 能够收集依赖。
 */
export function effect(fn: EffectFn, options?: EffectOptions): EffectRunner {
  const reactiveEffect = new ReactiveEffect(fn, options?.scheduler);
  reactiveEffect.run();

  const runner = reactiveEffect.run.bind(reactiveEffect) as EffectRunner;
  runner.effect = reactiveEffect;

  return runner;
}

export function stop(runner: EffectRunner): void {
  runner.effect.stop();
}
