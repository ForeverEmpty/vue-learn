# 第十八章复习：watch 的 immediate、清理与停止

> 状态：已批改。五道题全部通过。

## 1. immediate watch 创建时的执行流程是什么？为什么首次 oldValue 应为 undefined？

请说明 source 怎样收集依赖，以及首次 newValue 怎样成为下一次的 oldValue。

### 你的答案

```text
immediate watch
-> job()
-> watchEffect.run()
-> 收集依赖
-> callback()
```

首次未执行oldValue = watchEffect.run()，此时oldValue为undefined，执行job()后，newValue = watchEffect.run()，执行结束后，oldValue = newValue

### 批改

结论：正确，流程图可以再补两处。

- 流程骨架对：`immediate → job() → watcherEffect.run()`。`run()` 内部一条龙：清理旧依赖 → 设置 activeEffect → 执行 source 收集依赖 → 恢复 activeEffect → 返回 newValue。因 `initialized = false` 不 return，然后 `callback(newValue, undefined, onCleanup)`，最后 `oldValue = newValue`、`initialized = true`。
- "为什么 oldValue 是 undefined"：immediate 分支不预先执行 `oldValue = watcherEffect.run()`，所以 oldValue 保持 `let oldValue: T | undefined` 的初始 `undefined`；callback 之后 `oldValue = newValue`，成为下一次变化的 oldValue。
- 小提醒：函数名是 `watcherEffect`（不是 `watchEffect`）。

## 2. ReactiveEffect 的依赖清理与 onCleanup 注册的用户清理有什么区别？

请分别说明它们清理什么、在什么时候执行。

### 你的答案

ReactiveEffect 的依赖清理是清理本次执行的effcet之前的依赖，为了重新收集本次的新依赖，执行在执行effect之前
onCleanup 是用户自行定义的清理操作，目的是为了清除上次source的副作用，执行在下次callback前

### 批改

结论：正确。

- ReactiveEffect 的依赖清理（`cleanupEffect`）：删除 effect 已加入过的所有 dep 订阅关系，在每次 `run()` 开头执行，为了让条件分支重新收集依赖。
- onCleanup 用户清理：撤销上一次 callback 创建的 timer / 请求 / 监听等业务副作用，在下一次有效 callback 前执行；`stopWatch()` 时也会执行最后一次。
- 一句话：前者维护响应式依赖图，后者维护业务副作用，二者不能互相替代。（"effcet" 是 effect 的笔误。）

## 3. 为什么 job 必须先比较 newValue 和 oldValue，再决定是否执行上一次 cleanup？

### 你的答案

如果值未发生变化则不需要执行callback，也就不再需要清除上次source的副作用

### 批改

结论：正确。

关键在"依赖触发 ≠ watch 结果改变"。条件 source 可能因为某个依赖变化，但计算结果仍等于上一次（例如切到另一个值相等的分支）。此时 callback 并没有失效，所以不应撤销它创建的副作用。因此先比较，没变就 return（不清理、不回调）。

## 4. stopWatch 为什么必须同时调用 watcherEffect.stop() 和最后一次用户 cleanup？为什么重复停止不应重复清理？

### 你的答案

watcherEffect.stop()已有幂等性，防止多次执行用户定义的cleanup

只stop不clean：依赖虽然移除了，但上一次的副作用还在保留
只clean不stop：依赖未清除，再发生变化会再次建立副作用
第二次 stopWatch() 时 cleanup 已是 undefined，所以不会再次执行。watcherEffect.stop() 的幂等负责的是"不会重复移除依赖"

### 批改

结论：只答了一半，且第二问的机制归因有误。

第一问"为什么两个都要"没有答，两种缺失对应两种残留：

- 只 `stop()` 不 `runCleanup()`：effect 从依赖中移除了，但上一次 callback 留下的定时器 / 监听器等业务副作用仍然存在。
- 只 `runCleanup()` 不 `stop()`：副作用清掉了，但 effect 仍订阅依赖，下次源变化又会执行 callback 并建立新副作用。

第二问"重复停止为什么不重复清理"，你把它归因到 `stop()` 的幂等，其实防止重复执行 cleanup 的是 `runCleanup()` 的"先清空槽位再执行"：

```ts
const runCleanup = () => {
  const cleanupFunction = cleanup
  cleanup = undefined   // 先清空
  cleanupFunction?.()   // 再执行
}
```

第二次 `stopWatch()` 时 `cleanup` 已是 undefined，所以不会再次执行。`watcherEffect.stop()` 的幂等负责的是"不会重复移除依赖"（`active = false` 后直接 return），两者各管一件事。

## 5. 追踪下面的事件顺序，并解释每一步对应哪一轮 callback：

```text
immediate 创建
count 从 0 变为 1
count 从 1 变为 2
调用 stopWatch
```

假设每轮 callback 都记录 `callback:n`，并注册记录 `cleanup:n` 的清理函数。

### 你的答案

immediate -> callback:1
count 0-1 -> callback:2
count 1-2 -> callback:3
stopWatch -> callback:4

immediate -> callback:0 (newValue = 0, oldValue = undefined), cleanup:0
count 0-1 -> cleanup:0 -> callback(newValue = 1, oldValue = 0), cleanup:1
count 1-2 -> cleanup:1 -> callback(newValue = 2, oldValue = 1), cleanup:2
stopWatch -> cleanup:2

### 批改

结论：错误较多，需要重做。

- 这里的 `n` 是 **newValue**，不是"第几次"。count 初始是 0，所以 immediate 那轮是 `callback:0`，不是 `callback:1`。
- `stopWatch()` **不执行 callback**，只执行最后一次 cleanup（`cleanup:2`）。

正确追踪（count 初始为 0）：

```text
immediate 创建 → callback:0（newValue=0, oldValue=undefined），注册 cleanup:0
count 0→1     → cleanup:0 → callback:1（newValue=1, oldValue=0），注册 cleanup:1
count 1→2     → cleanup:1 → callback:2（newValue=2, oldValue=1），注册 cleanup:2
stopWatch     → watcherEffect.stop() + runCleanup() → cleanup:2（没有 callback）
```

完整事件顺序：

```text
callback:0 → cleanup:0 → callback:1 → cleanup:1 → callback:2 → cleanup:2
```

对照记忆：每轮变化都是"先清理上一轮、再执行本轮 callback、注册下一轮清理"；stop 只清理最后一次，不回调。
