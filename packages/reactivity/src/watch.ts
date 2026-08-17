import { hasChanged } from "@mini-vue/shared";
import { ReactiveEffect } from "./effect";

export type WatchSource<T> = () => T;
export type WatchCallback<T> = (newValue: T, oldValue: T) => void;

/**
 * 观察 source 的响应式依赖，并在结果变化后向 callback 提供新旧值。
 * callback 通过 scheduler 在依赖收集阶段之外执行。
 */
export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
): void {
  let oldValue!: T;
  let watcherEffect: ReactiveEffect<T>;

  const job = () => {
    const newValue = watcherEffect.run();

    if (!hasChanged(newValue, oldValue)) return;

    callback(newValue, oldValue);

    oldValue = newValue;
  };

  watcherEffect = new ReactiveEffect(source, job);

  oldValue = watcherEffect.run();
}
