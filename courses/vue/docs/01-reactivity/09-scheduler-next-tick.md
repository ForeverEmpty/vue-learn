# 第九章：scheduler 队列与 nextTick

第六章和第七章已经使用 scheduler 改变了 effect 的触发入口，但当前 scheduler 回调仍然是同步执行的。本章补上最小任务队列，让多个同步修改在一个微任务中合并，并提供 `nextTick` 等待本轮刷新完成。

```ts
effect(render, {
  scheduler: () => queueJob(runner),
})
```

## 本章目标

- 让 effect 支持公共 scheduler 选项。
- 使用 Set 保存待执行 job，避免同一个 job 重复排队。
- 使用 Promise 微任务异步刷新队列。
- 理解 `currentFlushPromise` 与 `nextTick` 的关系。
- 保持没有 scheduler 的普通 effect 同步执行。

## 当前行为：scheduler 仍然同步

第八章之后，ReactiveEffect 已经可以接收 scheduler，但第九章起点的 `queueJob` 只是直接调用：

```ts
export function queueJob(job: SchedulerJob): void {
  job()
}
```

因此：

```text
count.value = 1
→ triggerEffects
→ scheduler
→ queueJob
→ job 立即执行
```

这会让连续同步修改连续执行 effect：

```ts
count.value++
count.value++
```

如果每次都立刻刷新，就没有机会合并重复工作。

## 为什么使用 Set

队列只需要保存“要执行哪些 job”，不需要保存同一个 job 被加入了多少次：

```text
queueJob(job)
queueJob(job)
queueJob(job)
→ Set 中只有一份 job
```

Set 的两个作用：

- 自动去重同一个函数引用。
- 保留插入顺序，方便按排队顺序执行。

注意：只有同一个函数引用才能去重。每次创建新的箭头函数，Set 会认为它们是不同 job。

## 最小队列结构

推荐变量名：

| 含义 | 推荐变量名 |
| --- | --- |
| 待执行 job 集合 | `queue` |
| 是否已有刷新任务 | `isFlushPending` |
| 当前刷新 Promise | `currentFlushPromise` |
| 刷新函数 | `flushJobs` |
| 单个任务 | `job` |

核心状态可以这样表达：

```ts
const queue = new Set<SchedulerJob>()
let isFlushPending = false
let currentFlushPromise: Promise<void> | null = null
```

## 微任务刷新

如果还不熟悉 Promise、`then` 或“保存 Promise”的含义，先学习 [00. JS/TS 基础 - 01. Promise](../00-js-ts/01-promise-basics.md)，完成基础检查点后再回到这里。

使用 `Promise.resolve().then(...)` 把刷新放到当前同步代码之后：

```text
同步代码
→ queueJob(job)
→ queue 加入 job
→ 安排 Promise 微任务
→ 当前同步代码继续执行
→ 当前调用栈结束
→ flushJobs 执行
```

`isFlushPending` 防止同一轮重复安排多个 flush：

```text
第一次 queueJob
→ isFlushPending = false
→ 设置 true
→ 安排 flushJobs

第二次 queueJob
→ isFlushPending = true
→ 只加入 Set，不再安排新的 flush
```

## flushJobs

最小刷新流程：

```text
遍历 queue
→ 执行每个 job
→ 清空 queue
→ isFlushPending = false
→ currentFlushPromise = null
```

如果 job 执行过程中又加入新的 job，需要确保新 job 不会永久留在队列中。当前章节先使用 Set 的遍历行为处理同一轮新增任务，复杂的优先级和递归更新留到后续。

## nextTick 与 currentFlushPromise

`nextTick` 的目标是等待当前正在进行或即将进行的刷新：

```ts
nextTick(() => {
  // 此时当前队列已经刷新
})
```

有队列时：

```text
currentFlushPromise = flushJobs 对应的 Promise
nextTick(callback)
→ currentFlushPromise.then(callback)
```

没有队列时：

```text
currentFlushPromise = null
nextTick(callback)
→ Promise.resolve().then(callback)
```

因此 nextTick 始终是异步的，但会优先等待当前刷新。

## 检查点一：观察同步起点

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/scheduler.test.ts
```

起点实现预期有 1 个通过、3 个失败；全量测试预期有 43 个通过、3 个失败。失败会表现为 scheduler job 立即执行、重复修改没有合并，以及 nextTick 顺序错误。

playground 第九章中点击“同一 tick 修改两次”，当前实现会立即执行两次；完成队列后，两次修改应只保留一个待执行 job。

## 检查点二：实现 queueJob 和 flushJobs

1. 创建模块级 `queue` Set。
2. `queueJob` 先把 job 加入 queue。
3. 使用 `isFlushPending` 防止重复安排微任务。
4. 用 `Promise.resolve().then(flushJobs)` 安排异步刷新。
5. `flushJobs` 执行 queue 中的 job，然后清空状态。

完成后，同一个 tick 内多次修改只执行一次 runner。

## 检查点三：实现 nextTick

让 nextTick 读取当前刷新 Promise：

```text
有 currentFlushPromise
→ 在它之后执行 callback

没有 currentFlushPromise
→ 使用已 resolved 的 Promise 异步执行 callback
```

不要让 nextTick 直接同步执行 callback。即使没有待刷新的 job，也应该保留微任务语义。

## 检查点四：验证普通 effect 的兼容性

普通 effect 保持默认同步执行；传入 scheduler 后，由 scheduler 决定触发策略：

```text
没有 scheduler → triggerEffects 直接 run()
有 scheduler → triggerEffects 同步调用 scheduler
scheduler 调用 queueJob(runner) → runner 进入异步队列
```

因此 scheduler 本身不等于异步。computed 的 scheduler 可以同步标记缓存失效；需要合并更新的 effect 才让 scheduler 调用 `queueJob`。这样前七章原有的同步 effect、computed 内部 effect 和 watch scheduler 都能继续工作。

## 本章暂不处理

- 任务优先级和组件更新顺序。
- 递归更新检测。
- `flush: 'pre' | 'post'` 多种队列。
- `nextTick` 的组件实例绑定。
- 跨 tick 的取消和错误边界。

## 完成标准

- scheduler effect 的 job 不再同步执行。
- 同一个 tick 内同一个 job 只执行一次。
- nextTick callback 在当前队列刷新后执行。
- 没有 scheduler 的普通 effect 仍然同步执行。
- 前八章测试保持通过。
