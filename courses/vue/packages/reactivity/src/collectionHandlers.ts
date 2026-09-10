import { hasChanged, isObject } from "@mini-vue/shared";
import {
  isCollection,
  trackCollection,
  triggerCollection,
  type CollectionTarget,
} from "./collectionEffect";
import { reactive, readonly, toRaw } from "./reactive";
import { ReactiveFlags } from "./reactiveFlags";

type CollectionIteratorMethod =
  | "keys"
  | "values"
  | "entries"
  | typeof Symbol.iterator;

type CollectionForEachCallback = (
  value: unknown,
  key: unknown,
  observedCollection: CollectionTarget,
) => void;

interface ResolvedCollectionKey {
  rawKey: unknown;
  storedKey: unknown;
  hadKey: boolean;
}

function resolveCollectionKey(
  rawTarget: CollectionTarget,
  key: unknown,
): ResolvedCollectionKey {
  const rawKey = toRaw(key);

  if (rawTarget.has(rawKey)) return { rawKey, storedKey: rawKey, hadKey: true };

  if (rawKey !== key && rawTarget.has(key))
    return { rawKey, storedKey: key, hadKey: true };

  if (isObject(rawKey)) {
    for (const candidate of rawTarget.keys()) {
      if (toRaw(candidate) === rawKey) {
        return {
          rawKey,
          storedKey: candidate,
          hadKey: true,
        };
      }
    }
  }

  return { rawKey, storedKey: rawKey, hadKey: false };
}

/** 创建集合专用处理器，统一方法接收者、依赖、迭代结果与只读行为。 */
function createCollectionHandlers(
  readonlyMode: boolean,
  isShallow: boolean,
): ProxyHandler<object> {
  const wrap = (value: unknown): unknown => {
    if (isShallow) return value;

    if (!isObject(value)) return value;

    return readonlyMode ? readonly(value) : reactive(value);
  };

  const warnReadonly = (operation: string): void => {
    console.warn(`${operation} operation failed: target is readonly.`);
  };

  function createIterableMethod(method: CollectionIteratorMethod) {
    return function (this: CollectionTarget): IterableIterator<unknown> {
      const rawTarget = toRaw(this);
      const isMapTarget = rawTarget instanceof Map;

      const returnsPair =
        method === "entries" || (method === Symbol.iterator && isMapTarget);

      if (!readonlyMode) {
        const trackType =
          rawTarget instanceof Map && method === "keys" ? "keys" : "iterate";

        trackCollection(rawTarget, trackType);
      }

      const nativeMethod = Reflect.get(rawTarget, method) as (
        this: CollectionTarget,
      ) => IterableIterator<unknown>;

      const innerIterator = nativeMethod.call(rawTarget);

      const wrappedIterator: IterableIterator<unknown> = {
        next() {
          const result = innerIterator.next();

          if (result.done) return result;

          const value = result.value;

          if (returnsPair) {
            const [first, second] = value as [unknown, unknown];

            return {
              value: [wrap(first), wrap(second)],
              done: false,
            };
          }

          return {
            value: wrap(value),
            done: false,
          };
        },

        [Symbol.iterator]() {
          return this;
        },
      };

      return wrappedIterator;
    };
  }

  const instrumentations = {
    get(this: CollectionTarget, key: unknown) {
      const rawTarget = toRaw(this);

      if (!(rawTarget instanceof Map)) {
        throw new TypeError("get requires a Map receiver");
      }

      const { rawKey, storedKey } = resolveCollectionKey(rawTarget, key);

      if (!readonlyMode) trackCollection(rawTarget, "get", rawKey);

      return wrap(rawTarget.get(storedKey));
    },

    has(this: CollectionTarget, key: unknown) {
      const rawTarget = toRaw(this);

      const { rawKey, hadKey } = resolveCollectionKey(rawTarget, key);

      if (!readonlyMode) trackCollection(rawTarget, "has", rawKey);

      return hadKey;
    },

    set(this: CollectionTarget, key: unknown, value: unknown) {
      const rawTarget = toRaw(this);

      if (!(rawTarget instanceof Map)) {
        throw new TypeError("set requires a Map receiver");
      }

      if (readonlyMode) {
        warnReadonly("set");
        return this;
      }

      const { rawKey, storedKey, hadKey } = resolveCollectionKey(
        rawTarget,
        key,
      );

      const oldValue = rawTarget.get(storedKey);

      const nextValue = isShallow ? value : toRaw(value);

      const comparableOldValue = isShallow ? oldValue : toRaw(oldValue);

      rawTarget.set(storedKey, nextValue);

      if (!hadKey) {
        triggerCollection(rawTarget, "add", rawKey);
      } else if (hasChanged(nextValue, comparableOldValue)) {
        triggerCollection(rawTarget, "set", rawKey);
      }

      return this;
    },

    add(this: CollectionTarget, value: unknown) {
      const rawTarget = toRaw(this);

      if (!(rawTarget instanceof Set)) {
        throw new TypeError("add requires a Set receiver");
      }

      if (readonlyMode) {
        warnReadonly("add");
        return this;
      }

      const { rawKey, hadKey } = resolveCollectionKey(rawTarget, value);

      if (!hadKey) {
        rawTarget.add(rawKey);
        triggerCollection(rawTarget, "add", rawKey);
      }
      return this;
    },

    delete(this: CollectionTarget, key: unknown) {
      const rawTarget = toRaw(this);

      if (!isCollection(rawTarget)) {
        throw new TypeError("delete requires a collection receiver");
      }

      if (readonlyMode) {
        warnReadonly("delete");
        return false;
      }

      const { rawKey, storedKey, hadKey } = resolveCollectionKey(
        rawTarget,
        key,
      );

      const didDelete = hadKey ? rawTarget.delete(storedKey) : false;

      if (didDelete) triggerCollection(rawTarget, "delete", rawKey);

      return didDelete;
    },

    clear(this: CollectionTarget) {
      const rawTarget = toRaw(this);

      if (!isCollection(rawTarget)) {
        throw new TypeError("clear requires a collection receiver");
      }

      if (readonlyMode) {
        warnReadonly("clear");
        return;
      }

      const hadItems = rawTarget.size > 0;

      rawTarget.clear();

      if (hadItems) triggerCollection(rawTarget, "clear");
    },

    keys: createIterableMethod("keys"),
    values: createIterableMethod("values"),
    entries: createIterableMethod("entries"),
    [Symbol.iterator]: createIterableMethod(Symbol.iterator),

    forEach(
      this: CollectionTarget,
      callback: CollectionForEachCallback,
      thisArg?: unknown,
    ) {
      const rawTarget = toRaw(this);

      if (!readonlyMode) trackCollection(rawTarget, "iterate");

      rawTarget.forEach((value, key) => {
        callback.call(thisArg, wrap(value), wrap(key), this);
      });
    },
  };

  return {
    get(target, key, receiver) {
      if (key === ReactiveFlags.IS_REACTIVE) return !readonlyMode;
      if (key === ReactiveFlags.IS_READONLY) return readonlyMode;

      const hasWrapper = Object.prototype.hasOwnProperty.call(
        instrumentations,
        key,
      );

      if (key === "size" && isCollection(target)) {
        if (!readonlyMode) trackCollection(target, "size");

        return Reflect.get(target, key, target);
      }

      if (hasWrapper && key in target) {
        return Reflect.get(instrumentations, key, receiver);
      }

      // 起点故意保留普通 Reflect 转发，Map/Set 的内部槽位错误由此观察。
      // 不要把所有方法简单 bind(target)，否则写入和迭代都不会收集/触发依赖。
      return Reflect.get(target, key, receiver);
    },
  };
}

export const mutableCollectionHandlers = createCollectionHandlers(false, false);
export const readonlyCollectionHandlers = createCollectionHandlers(true, false);
export const shallowCollectionHandlers = createCollectionHandlers(false, true);
export const shallowReadonlyCollectionHandlers = createCollectionHandlers(
  true,
  true,
);
