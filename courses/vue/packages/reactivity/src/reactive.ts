import { mutableHandlers } from './baseHandlers';

type Proxy = object
type Raw = object

const reactiveMap = new WeakMap<Raw, Proxy>();
const rawMap = new WeakMap<Proxy, Raw>();

export function toRaw<T>(observed: T): T {
  if (typeof observed !== 'object' || observed === null) {
    return observed
  }

  const raw = rawMap.get(observed)

  return (raw ?? observed) as T
}

/**
 * 为普通对象创建响应式代理，并复用原对象已有的 Proxy。
 * 嵌套对象由 getter 在首次读取时惰性转换。
 */
export function reactive<T extends object>(target: T): T {
  if (rawMap.has(target)) return target;

  const existingProxy = reactiveMap.get(target);

  if (existingProxy) return existingProxy as T;

  const proxy = new Proxy(target, mutableHandlers) as T;
  reactiveMap.set(target, proxy);
  rawMap.set(proxy, target);

  return proxy;
}
