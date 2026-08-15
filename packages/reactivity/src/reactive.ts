import { mutableHandlers } from './baseHandlers';

/**
 * 为普通对象创建浅层响应式代理。
 * 属性读写由 mutableHandlers 拦截，嵌套对象暂时保持原样。
 */
export function reactive<T extends object>(target: T): T {
  return new Proxy(target, mutableHandlers) as T;
}
