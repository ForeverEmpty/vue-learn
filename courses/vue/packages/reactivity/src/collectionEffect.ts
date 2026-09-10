import { trackEffect, triggerEffects, type Dep } from "./effect";

/** Map 的 key 可以是任意值，不能沿用普通对象的 PropertyKey 限制。 */
export type CollectionTarget = Map<unknown, unknown> | Set<unknown>;
export type CollectionTrackType = "get" | "has" | "size" | "keys" | "iterate";
export type CollectionTriggerType = "add" | "set" | "delete" | "clear";

/** 数据键与内部统计依赖分开保存，避免 map.get("size") 与 map.size 冲突。 */
export interface CollectionDeps {
  get: Map<unknown, Dep>;
  has: Map<unknown, Dep>;
  size: Dep;
  keys: Dep;
  iterate: Dep;
}

/** 按原始集合保存集合专用依赖，避免与普通对象的 PropertyKey 依赖表混用。 */
const collectionTargetMap = new WeakMap<CollectionTarget, CollectionDeps>();

export function isCollection(value: unknown): value is CollectionTarget {
  return value instanceof Map || value instanceof Set;
}

/** 找到集合操作对应的 Dep，并复用 effect 的分支清理与 stop 机制。 */
export function trackCollection(
  target: CollectionTarget,
  type: CollectionTrackType,
  key?: unknown,
): void {
  let deps = collectionTargetMap.get(target);

  if (!deps) {
    deps = {
      get: new Map(),
      has: new Map(),
      size: new Set(),
      keys: new Set(),
      iterate: new Set(),
    };

    collectionTargetMap.set(target, deps);
  }

  let dep: Dep;

  if (type === "get" || type === "has") {
    const keyDeps = deps[type];

    dep = keyDeps.get(key) ?? new Set();

    if (!keyDeps.has(key)) keyDeps.set(key, dep);
  } else {
    dep = deps[type];
  }

  trackEffect(dep);
}

/** 合并一次集合变更命中的全部 Dep，确保同一 effect 每次操作只执行一次。 */
export function triggerCollection(
  target: CollectionTarget,
  type: CollectionTriggerType,
  key?: unknown,
): void {
  const deps = collectionTargetMap.get(target);
  const effectsToRun: Dep = new Set();

  if (!deps) return;

  const collectionEffects = (dep?: Dep): void => {
    dep?.forEach((effect) => {
      effectsToRun.add(effect);
    });
  };

  if (type === "set") {
    collectionEffects(deps.get.get(key));
    collectionEffects(deps.iterate);
  }

  if (type === "add" || type === "delete") {
    collectionEffects(deps.get.get(key));
    collectionEffects(deps.has.get(key));
    collectionEffects(deps.size);

    if (target instanceof Map) {
      collectionEffects(deps.keys);
    }

    collectionEffects(deps.iterate);
  }

  if (type === "clear") {
    deps.get.forEach((dep) => {
      collectionEffects(dep);
    });

    deps.has.forEach((dep) => {
      collectionEffects(dep);
    });

    collectionEffects(deps.size);
    collectionEffects(deps.keys);
    collectionEffects(deps.iterate);
  }

  triggerEffects(effectsToRun);
}
