# 第十九章：deep watch、watchEffect 与监听调度

第十八章让 watch 拥有了生命周期控制，但它只能观察 getter 的"第一层结果"。当 getter 返回一个响应式对象时，只有"整个对象被替换"才会触发；对象内部属性变化不会被察觉。本章补齐三个能力：深入对象内部追踪、无需 source 的 watchEffect，以及控制 callback 执行时机的 flush 调度。

## 本章目标

- 理解 getter 返回对象时为什么只追踪引用，不追踪内部。
- 实现 `traverse` 递归读取，收集深层依赖。
- 让 `deep: true` 在首次与每次变化时都遍历结果。
- 实现 `watchEffect`：立即执行、自动收集、变化后重新执行。
- 复用 onCleanup 与 stop 机制，避免重写一套清理逻辑。
- 理解同步执行与批量微任务执行的区别。
- 实现 `flush: "sync" | "pre" | "post"` 三种调度时机。
- 保持前 18 章 watch 行为不变。

## 1. 为什么 getter 返回对象时只追踪引用

```ts
const state = reactive({ user: { name: "Ada" } })

watch(
  () => state.user,
  (newValue) => {
    // ...
  },
)
```

getter `() => state.user` 只读取了 `state` 的 `user` 属性。依赖图里记录的是"根对象的 user 键"：

```text
读 state.user
→ 触发根 Proxy 的 get trap
→ track(根对象, "user")
→ 只订阅 user 键的 dep
```

当执行 `state.user.name = "Grace"` 时，这次写入走的是**嵌套对象**的 set trap：

```text
写 state.user.name
→ 先读 state.user（返回嵌套 Proxy）
→ 在嵌套 Proxy 上写 name
→ trigger(嵌套对象, "name")
```

它触发的是嵌套对象的 `name` 键，而不是根对象的 `user` 键。所以上面的 watch 不会执行 callback。deep watch 要解决的，就是"替 getter 把返回对象内部也读一遍"，把这些深层键也纳入依赖。

## 2. traverse：递归读取收集深层依赖

核心是一个模块内私有函数：

```ts
function traverse(value: unknown, seen = new Set<object>()): void {
  if (!isObject(value) || seen.has(value)) return
  seen.add(value)

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else {
    for (const key of Reflect.ownKeys(value)) {
      if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue
      traverse(Reflect.get(value, key), seen)
    }
  }
}
```

逐段理解：

```text
!isObject(value)
→ 基本类型（string/number/boolean/null/undefined）没有子属性，直接结束

seen.has(value)
→ 已经遍历过这个对象，跳过，防止循环引用无限递归

Array.isArray(value)
→ 数组按索引遍历每个元素

否则
→ Reflect.ownKeys 同时取得字符串键和 Symbol 键
→ propertyIsEnumerable 只保留可枚举属性
→ 读取每个属性值并继续向下遍历
```

关键点：`value` 必须是 **reactive Proxy**（或包含 reactive Proxy 的对象）时，读取 `value[key]` 才会触发 get trap 并收集依赖。如果传入的是普通 raw 对象，遍历只是读了一遍普通属性，不会产生任何订阅。

这里不能只使用 `Object.keys(value)`。它只返回可枚举的字符串键，会漏掉下面的 `profileKey`：

```ts
const profileKey = Symbol("profile")
const state = reactive({
  [profileKey]: { score: 0 },
})
```

`Reflect.ownKeys` 会拿到字符串键与 Symbol 键，但也会包含不可枚举属性，所以还要用：

```ts
Object.prototype.propertyIsEnumerable.call(value, key)
```

它的结构与之前学过的 `hasOwnProperty.call` 相同：从 `Object.prototype` 取得可靠的原型方法，再用 `call` 把本次检查的 `this` 指向 `value`。这样即使 `value` 自己覆盖了同名方法，也不会调用错函数。

## 3. traverse 必须在 activeEffect 内执行

关键陷阱：`track()` 只有在 `activeEffect` 存在时才收集依赖，而 `activeEffect` 只在 `ReactiveEffect.run()` 执行期间存在。所以 traverse **不能**写在 `run()` 返回之后：

```ts
// ❌ 错误：run() 返回后 activeEffect 已恢复，traverse 读到的依赖不会被收集
oldValue = watcherEffect.run()
traverse(oldValue)
```

正确做法是把 traverse 包进 getter，让它随 source 一起在 `run()` 内部执行：

```ts
const getter = () => {
  const value = source()
  if (deep) traverse(value)
  return value
}

watcherEffect = new ReactiveEffect(getter, job)
```

这样无论首次 `run()` 还是 job 里的 `run()`，getter 都会先取 source 结果、再 deep 遍历，两步都发生在 activeEffect 存在期间，深层依赖才能被真正收集。

为什么每次变化都要再遍历一次：getter 可能返回不同的对象，本次的深层依赖可能和上次不同。getter 每次都重新遍历当前结果，深层依赖才不会漏。

还有第二个陷阱：deep watch 的 getter 返回的是**同一个缓存 Proxy**。`state.user` 每次都返回 reactiveMap 里的同一个对象，所以修改内部属性后，`newValue === oldValue`，`hasChanged` 返回 false。因此 job 的比较必须让 deep 跳过引用比较：

```ts
if (initialized && !deep && !hasChanged(newValue, oldValue)) return
```

deep 时只要依赖触发就执行 callback——因为引用没变、内容变了，引用比较无法察觉这种变化。

这也意味着 deep watch 的 `oldValue` 不是修改前的快照：嵌套属性变化时，`newValue` 和 `oldValue` 指向同一个 Proxy，两者看到的都是修改后的内容。若业务真的需要修改前的深层数据，必须自行复制快照，不能把 `oldValue` 当成自动快照。

## 4. WatchOptions 与 WatchEffectOptions

起点已经增加类型：

```ts
export type WatchFlushMode = "pre" | "post" | "sync"

export interface WatchOptions {
  immediate?: boolean
  deep?: boolean
  flush?: WatchFlushMode
}

export interface WatchEffectOptions {
  flush?: WatchFlushMode
}
```

`deep` 与 `flush` 都属于 watch；`watchEffect` 只需要 `flush`，因为 watchEffect 没有 source、没有 oldValue/newValue，也就没有 deep 概念。

## 5. 为什么需要 watchEffect

很多场景只关心"某个响应式状态改变了，就重新执行一段逻辑"，并不需要新旧值：

```ts
const count = ref(0)
const doubled = ref(0)

watchEffect(() => {
  doubled.value = count.value * 2
})
```

它等价于"把副作用函数本身当作 source 和 callback 的合体"：

```text
创建时立即执行 effect
→ effect 内部读取 count.value
→ 收集依赖
→ count 变化后重新执行 effect
→ 重复收集依赖
```

watchEffect 没有 `immediate`、没有 `hasChanged` 比较、没有新旧值，但它同样需要 onCleanup 和停止。

## 6. watchEffect 的实现结构

签名：

```ts
export type WatchEffectCallback = (onCleanup: OnCleanup) => void

export function watchEffect(
  effect: WatchEffectCallback,
  options: WatchEffectOptions = {},
): WatchStopHandle
```

结构上复用第十八章的清理机制，但 job 更简单——它没有"先算新值再比较"这一步：

```ts
let cleanup: WatchCleanup | undefined

const onCleanup: OnCleanup = (cleanupFunction) => {
  cleanup = cleanupFunction
}

const runCleanup = () => {
  const cleanupFunction = cleanup
  cleanup = undefined
  cleanupFunction?.()
}

const job = () => {
  runCleanup()
  watcherEffect.run()   // 重新执行 effect，收集新依赖
}

watcherEffect = new ReactiveEffect(() => {
  effect(onCleanup)      // 把 onCleanup 交给用户
}, scheduler)

watcherEffect.run()      // 立即执行第一次
```

阅读要点：

```text
watcherEffect.run()
→ 执行 () => effect(onCleanup)
→ 用户 effect 读取响应式值、注册 cleanup、产生副作用

依赖变化
→ scheduler 触发 job
→ runCleanup() 执行上一次 cleanup
→ watcherEffect.run() 再次执行 effect
```

### 防止 watchEffect 同步触发自己

watchEffect 的函数既会读取响应式值，也可能写入响应式值：

```ts
const count = ref(0)

watchEffect(() => {
  count.value++
})
```

`count.value++` 同时包含一次读取和一次写入。如果写入时立即再次运行当前 watchEffect，就会形成：

```text
第一次执行 → 写 count → 第二次执行 → 再写 count → …… → 调用栈溢出
```

因此 `triggerEffects` 在遍历依赖时要跳过当前仍在执行的 `activeEffect`：

```ts
if (effect === activeEffect) return
```

这里跳过的只是“本次执行期间由自己造成的同步触发”。等本次 `run()` 结束后，其他代码再次修改 `count`，这个 watchEffect 仍然会正常执行。

变量名建议：

| 含义 | 推荐名称 |
| --- | --- |
| 用户传入的副作用函数 | `effect` |
| 保存的用户清理函数 | `cleanup` |
| 注册清理的函数 | `onCleanup` |
| 执行清理的函数 | `runCleanup` |
| 内部响应式副作用对象 | `watcherEffect` |
| 停止句柄 | `stopWatch` |

## 7. 为什么需要 flush 调度

前 18 章的 watch 是同步执行：依赖变化 → 立即算新值 → 立即 callback。这在简单场景没问题，但同一轮里连续多次修改时会产生冗余执行：

```ts
count.value = 1
count.value = 2
count.value = 3
```

同步模式下 callback 会执行 3 次，中间值 `1`、`2` 对调用者往往没有意义。更理想的行为是"把多次变化合并，微任务里只执行一次，拿到最终值 `3`"。

这就是 flush 要控制的调度时机。

## 8. 三种 flush 模式

```ts
export type WatchFlushMode = "pre" | "post" | "sync"
```

| 模式 | 时机 | 本项目默认 |
| --- | --- | --- |
| `sync` | 依赖变化时同步执行 job | ✅（兼容前 18 章） |
| `pre` | job 加入队列，微任务里批量执行 | 否 |
| `post` | job 加入 post 队列，在 pre 之后执行 | 否 |

注意：真实 Vue 的默认值是 `pre`，本项目为保持前 18 章"同步 callback"的行为不变，默认使用 `sync`。理解机制后可以自行把默认值改为 `pre`。

watch 的 scheduler 根据 flush 选择：

```ts
const flush = options.flush ?? "sync"

let scheduler: EffectScheduler

if (flush === "sync") {
  scheduler = job
} else if (flush === "pre") {
  scheduler = () => queueJob(job)
} else {
  scheduler = () => queuePostFlushJob(job)
}

watcherEffect = new ReactiveEffect(getter, scheduler)
```

### sync 模式为什么要先更新 oldValue

用户 callback 不是只读函数，它可能再次修改正在监听的 source：

```ts
watch(
  () => count.value,
  (newValue) => {
    if (newValue === 1) count.value = 2
  },
  { flush: "sync" },
)
```

第一次 callback 尚未返回时，`count.value = 2` 会同步进入第二次 job，这叫“重入”。如果等 callback 返回后才保存 `oldValue = newValue`，第二次 job 仍会读到过期的 oldValue；并且第二次保存的新值还会被外层 job 覆盖。

正确顺序是先保存本次状态，再进入用户代码：

```ts
const previousValue = oldValue
oldValue = newValue
initialized = true

runCleanup()
callback(newValue, previousValue, onCleanup)
```

于是连续的变化记录才是 `0 → 1`、`1 → 2`、`2 → 3`，而不会出现 oldValue 落后一轮。

## 9. pre 队列与 post 队列

第九章的 scheduler 已经提供 `queueJob`（去重队列 + 微任务刷新）。`pre` 直接复用即可。`post` 需要一个独立的 post 队列，它必须在 pre 队列清空之后执行。

在 scheduler 中增加：

```ts
const pendingPostFlushCbs = new Set<SchedulerJob>()

function flushJobs(): void {
  try {
    do {
      queue.forEach((job) => job())
      queue.clear()
      flushPostJobs()
    } while (queue.size > 0 || pendingPostFlushCbs.size > 0)
  } finally {
    queue.clear()
    pendingPostFlushCbs.clear()
    isFlushPending = false
    currentFlushPromise = null
  }
}

function flushPostJobs(): void {
  pendingPostFlushCbs.forEach((job) => job())
  pendingPostFlushCbs.clear()
}

function queueFlush(): void {
  if (isFlushPending) return

  isFlushPending = true
  currentFlushPromise = resolvedPromise.then(flushJobs)
}

export function queuePostFlushJob(job: SchedulerJob): void {
  pendingPostFlushCbs.add(job)
  queueFlush()
}
```

关键点一：`flushJobs` 自己控制两个阶段，先执行并清空普通队列，再调用 `flushPostJobs`。因此顺序不依赖 watch 的订阅顺序；即使 post watcher 比 pre watcher 更早订阅，也一定先刷新 pre。

一个容易写错的方案，是把 `flushPostJobs` 本身当作普通 job 插入 `queue`。`Set` 按插入顺序执行；若 post watcher 先触发，`flushPostJobs` 就会比后加入的 pre job 更早执行，结果反而变成 `post → pre`。

关键点二：`Set.prototype.forEach` 是活迭代——运行中新增的不同 job 会被继续访问，所以 post job 运行中注册的新 post job 会在同一轮被处理。外层 `do...while` 还负责一种额外情况：如果 post job 又加入了 pre job，会再开始一轮“pre 后 post”，而不是把新任务直接丢掉。

关键点三：pre 与 post 共用 `queueFlush` 和同一个 `currentFlushPromise`。因此只有 post job 时也会安排微任务，`nextTick()` 也会等待 post 阶段执行结束。

关键点四：外层 `try/finally` 保证无论 job 是否抛异常，两个队列都会清空，`isFlushPending` 与 `currentFlushPromise` 都会复位，不会出现“标志卡住、后续 job 永不刷新”的死状态。若某个 job 抛异常，尚未执行的 job 会被丢弃，这是本项目接受的简化错误语义。

## 10. 已入队的 job 在 stop 后不应执行

pre/post 模式下，job 入队后到微任务刷新之间有时间窗。若调用者在此期间调用 stop，队列里的 job 仍会执行——需要 job 检查停止状态：

```ts
let stopped = false

const job = () => {
  if (stopped) return
  // ...
}

const stopWatch: WatchStopHandle = () => {
  stopped = true
  watcherEffect.stop()
  runCleanup()
}
```

watch 与 watchEffect 的 job 都要加这个守卫。

## 11. flush 的默认值为什么是 sync

为了不破坏前 18 章的测试和已有行为，`options.flush` 缺省时解析为 `"sync"`。这样：

```ts
watch(() => count.value, callback)   // 默认同步，与第 7～18 章一致
watch(() => count.value, callback, { flush: "pre" })  // 显式批量
```

如果你希望与 Vue 对齐，可以把缺省值改成 `"pre"`，并把前两章的 watch 测试改成 `await nextTick()` 后断言——本章不做这个破坏性迁移。

## 检查点一：观察起点行为

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-deep-effect.test.ts
```

起点预期：

```text
3 passed
9 failed
```

先观察：

- 非 deep 的嵌套变化确实不触发（已通过）。
- `deep: true` 目前被忽略，嵌套变化不触发。
- `watchEffect` 是空桩，什么都不做。
- `flush: "sync"` 与默认同步已通过，但 `pre`/`post` 未实现。

请先回答：为什么 `() => state.user` 只追踪 `user` 键，而 `state.user.name = ...` 不会触发它？

## 检查点二：实现 deep

1. 新增模块私有 `traverse`（参考第 2 节），普通对象同时遍历可枚举的字符串键和 Symbol 键。
2. watch 读取 `options.deep`。
3. 新增 getter：先 `source()` 得到 value，若 deep 则 `traverse(value)`，再返回 value。
4. `ReactiveEffect` 使用这个 getter，而不是原始 source。
5. job 与首次初始化不再单独调用 traverse。
6. job 的判断改为 `initialized && !deep && !hasChanged(newValue, oldValue)` 时 return，让 deep 跳过引用比较。

完成后预期：

```text
6 passed
6 failed
```

## 检查点三：实现 watchEffect

1. 删除空桩，实现 `watchEffect`。
2. 新建 cleanup 槽位、onCleanup、runCleanup。
3. job 先 runCleanup 再 `watcherEffect.run()`。
4. `ReactiveEffect` 的 fn 是 `() => effect(onCleanup)`。
5. 创建时立即 `watcherEffect.run()`。
6. 返回 stop：`watcherEffect.stop()` + `runCleanup()`。
7. `triggerEffects` 跳过当前 `activeEffect`，防止 watchEffect 的同步自写入无限递归。

本检查点 watchEffect 暂用同步 scheduler（`flush` 下一检查点统一处理）。

完成后预期：

```text
10 passed
2 failed
```

## 检查点四：实现 flush 调度

1. 在 scheduler 增加 `queuePostFlushJob` 与 post 队列（参考第 9 节）。
2. watch 与 watchEffect 读取 `options.flush`，缺省为 `"sync"`。
3. 根据 `sync` / `pre` / `post` 选择 scheduler。
4. 把 scheduler 传给 `ReactiveEffect` 构造器——watch 传的是 deep 包装后的 `getter`，不是原始 source。
5. 给 job 增加 `stopped` 守卫（参考第 10 节）：stop 后已入队的 job 不应再执行。
6. watch 的 job 在 callback 前更新内部 oldValue，保证 `sync` 重入时的新旧值连续。
7. post 队列由 `flushJobs` 在全部 pre job 后显式刷新，不能把 `flushPostJobs` 当作普通 pre job 入队。

完成后预期：

```text
12 passed
```

## 检查点五：边界验收

基础测试通过后，我会补充测试以下边界：

- 循环引用对象的 traverse 不会无限递归。
- deep 在 getter 切换返回对象时，旧对象的深层依赖被正确清理。
- watchEffect 条件分支的依赖重收集。
- `flush: "pre"` 下 stop 与 cleanup 的时序。
- post 队列中继续注册 post job 仍能全部执行。
- post 队列中注册的新普通 job 不会丢失，且 `nextTick` 会等待它。
- post watcher 先订阅时仍然后于 pre watcher 执行。
- watchEffect 修改自己读取的依赖时不会无限递归。
- `sync` watch 重入时 oldValue 不会落后一轮。
- deep watch 能追踪可枚举 Symbol 属性。

最终预期：

```text
22 passed
```

## 本章暂不处理

- 直接传入 reactive 对象作为 source（`watch(reactiveObj, cb)`）。
- source 数组与多 source 合并。
- `flush: "post"` 与组件渲染器的联动。
- 把默认 flush 迁移为 `"pre"` 的破坏性改动。
- callback 返回 Promise 的自动取消。
- 一次 callback 注册多个 cleanup 的语义。

## 完成标准

- `deep: true` 能在首次与每次变化时收集深层依赖。
- 非 deep 不追踪嵌套变化，行为与第 18 章一致。
- traverse 对循环引用安全。
- traverse 不漏掉可枚举 Symbol 属性。
- watchEffect 立即执行、自动收集、变化后重新执行。
- watchEffect 同步写入自己的依赖时不会递归溢出。
- watchEffect 支持 onCleanup 与停止。
- `flush: "sync"` 同步执行且重入时 oldValue 连续，`"pre"` 批量合并，`"post"` 不受订阅顺序影响且总在 pre 之后。
- 前 18 章测试继续通过（默认同步行为不变）。
