import { isObject } from "@mini-vue/shared";
import { mutableHandlers } from "./baseHandlers";
import { readonlyHandlers } from "./readonlyHandlers";
import { ReactiveFlags } from "./reactiveFlags";

type Proxy = object;
type Raw = object;

const reactiveMap = new WeakMap<Raw, Proxy>();
const rawMap = new WeakMap<Proxy, Raw>();
const readonlyMap = new WeakMap<Raw, Proxy>();

export function toRaw<T>(observed: T): T {
  if (!isObject(observed)) {
    return observed;
  }

  const raw = rawMap.get(observed);

  return (raw ?? observed) as T;
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

/** 为对象创建深层只读代理，并按原对象复用已有的 readonly Proxy。 */
export function readonly<T extends object>(target: T): Readonly<T> {
  if (isReadonly(target)) return target as Readonly<T>;

  const rawTarget = toRaw(target);
  const existingProxy = readonlyMap.get(rawTarget);

  if (existingProxy) return existingProxy as Readonly<T>;

  const proxy = new Proxy(rawTarget, readonlyHandlers) as Readonly<T>;
  readonlyMap.set(rawTarget, proxy);
  rawMap.set(proxy, rawTarget);

  return proxy as Readonly<T>;
}

export function isReactive(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  return Boolean(Reflect.get(value, ReactiveFlags.IS_REACTIVE));
}

export function isReadonly(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  return Boolean(Reflect.get(value, ReactiveFlags.IS_READONLY));
}

export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value);
}
