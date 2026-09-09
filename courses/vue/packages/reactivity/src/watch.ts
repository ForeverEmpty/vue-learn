import { hasChanged } from "@mini-vue/shared";
import { ReactiveEffect } from "./effect";

export type WatchSource<T> = () => T;
export type WatchCleanup = () => void;
export type OnCleanup = (cleanup: WatchCleanup) => void;
export type WatchCallback<T> = (
  newValue: T,
  oldValue: T | undefined,
  onCleanup: OnCleanup,
) => void;
export type WatchStopHandle = () => void;

export interface WatchOptions {
  immediate?: boolean;
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

  let initialized = false;

  const onCleanup: OnCleanup = (cleanupFunction) => {
    cleanup = cleanupFunction;
  };

  const runCleanup = () => {
    const cleanupFunction = cleanup;
    cleanup = undefined;
    cleanupFunction?.();
  };

  const job = () => {
    const newValue = watcherEffect.run();

    if (initialized && !hasChanged(newValue, oldValue)) return;

    runCleanup();
    callback(newValue, oldValue, onCleanup);

    oldValue = newValue;

    initialized = true;
  };

  watcherEffect = new ReactiveEffect(source, job);

  if (immediate) {
    job();
  } else {
    oldValue = watcherEffect.run();
    initialized = true;
  }

  const stopWatch: WatchStopHandle = () => {
    watcherEffect.stop();
    runCleanup();
  };

  // 第十八章起点：暂未处理 immediate、用户清理和停止监听。
  return stopWatch;
}
