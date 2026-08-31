import { ReactiveFlags } from "./reactiveFlags";

/**
 * 为可扩展对象写入不可枚举的跳过标记，并始终返回原输入。
 * 不可扩展对象无法增加内部属性，交由代理工厂统一判断是否跳过。
 */
export function markRaw<T extends object>(value: T): T {
  if (!Object.isExtensible(value)) return value;
  if (Reflect.get(value, ReactiveFlags.SKIP)) return value;

  Object.defineProperty(value, ReactiveFlags.SKIP, {
    value: true,
    configurable: true,
  });

  return value;
}

/**
 * 有内部标记或对象不可扩展时，通知所有响应式工厂保留原对象。
 */
export function shouldSkipReactive(target: object): boolean {
  return (
    !Object.isExtensible(target) ||
    Boolean(Reflect.get(target, ReactiveFlags.SKIP))
  );
}
