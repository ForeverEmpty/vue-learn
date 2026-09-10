import { hasChanged, isObject } from "@mini-vue/shared";
import { ReactiveEffect, type EffectScheduler } from "./effect";
import { queueJob, queuePostFlushJob } from "./scheduler";

export type WatchSource<T> = () => T;
export type WatchCleanup = () => void;
export type OnCleanup = (cleanup: WatchCleanup) => void;
export type WatchCallback<T> = (
  newValue: T,
  oldValue: T | undefined,
  onCleanup: OnCleanup,
) => void;
export type WatchStopHandle = () => void;
export type WatchFlushMode = "pre" | "post" | "sync";
export type WatchEffectCallback = (onCleanup: OnCleanup) => void;

export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
  flush?: WatchFlushMode;
}

export interface WatchEffectOptions {
  flush?: WatchFlushMode;
}

function traverse(value: unknown, seen = new Set<object>()): void {
  if (!isObject(value) || seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen);
    }
  } else {
    for (const key of Reflect.ownKeys(value)) {
      if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue;
      traverse(Reflect.get(value, key), seen);
    }
  }
}

/**
 * 观察 source 的响应式依赖，并在结果变化后向 callback 提供新旧值。
 * callback 通过 scheduler 在依赖收集阶段之外执行。
 */
export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options: WatchOptions = {},
): WatchStopHandle {
  let oldValue: T | undefined;
  let watcherEffect: ReactiveEffect<T>;
  let cleanup: WatchCleanup | undefined;
  const immediate = options.immediate ?? false;
  const deep = options.deep ?? false;
  const flush = options.flush ?? "sync";

  let stopped = false;

  let scheduler: EffectScheduler;

  let initialized = false;

  const onCleanup: OnCleanup = (cleanupFunction) => {
    cleanup = cleanupFunction;
  };

  const runCleanup = () => {
    const cleanupFunction = cleanup;
    cleanup = undefined;
    cleanupFunction?.();
  };

  const getter = () => {
    const value = source();
    if (deep) traverse(value);
    return value;
  };

  const job = () => {
    if (stopped) return;
    const newValue = watcherEffect.run();

    if (initialized && !deep && !hasChanged(newValue, oldValue)) return;

    const previousValue = oldValue;
    oldValue = newValue;
    initialized = true;

    runCleanup();
    callback(newValue, previousValue, onCleanup);
  };

  switch (flush) {
    case "sync":
      scheduler = job;
      break;
    case "pre":
      scheduler = () => queueJob(job);
      break;
    case "post":
      scheduler = () => queuePostFlushJob(job);
      break;
  }

  watcherEffect = new ReactiveEffect(getter, scheduler);

  if (immediate) {
    job();
  } else {
    oldValue = watcherEffect.run();
    initialized = true;
  }

  const stopWatch: WatchStopHandle = () => {
    stopped = true;
    watcherEffect.stop();
    runCleanup();
  };

  return stopWatch;
}

/**
 * 立即执行副作用并自动收集其响应式依赖；依赖变化后按 flush 配置重新执行。
 */
export function watchEffect(
  effect: WatchEffectCallback,
  options: WatchEffectOptions = {},
): WatchStopHandle {
  let cleanup: WatchCleanup | undefined;
  const flush = options.flush ?? "sync";

  let stopped = false;

  let scheduler: EffectScheduler;

  const onCleanup: OnCleanup = (cleanupFunction) => {
    cleanup = cleanupFunction;
  };

  const runCleanup = () => {
    const cleanupFunction = cleanup;
    cleanup = undefined;
    cleanupFunction?.();
  };

  const job = () => {
    if (stopped) return;
    runCleanup();
    watcherEffect.run();
  };

  switch (flush) {
    case "sync":
      scheduler = job;
      break;
    case "pre":
      scheduler = () => queueJob(job);
      break;
    case "post":
      scheduler = () => queuePostFlushJob(job);
      break;
  }

  const watcherEffect = new ReactiveEffect(() => {
    effect(onCleanup);
  }, scheduler);

  watcherEffect.run();

  const stopWatch: WatchStopHandle = () => {
    stopped = true;
    watcherEffect.stop();
    runCleanup();
  };

  return stopWatch;
}
