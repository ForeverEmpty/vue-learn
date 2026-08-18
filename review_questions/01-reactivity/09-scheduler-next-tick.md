# 第九章复习：scheduler 队列与 nextTick

> 状态：已批改，通过。

## 1. 为什么 scheduler 队列需要使用 Set？同一个 job 在一个 tick 内重复加入时应该发生什么？

用于去重，避免重复执行
去重

> **批改：核心结论正确，但需要更精确。** Set 按函数引用去重；同一个 `runner` 在同一 tick 内多次加入时只保留一份，因此本轮只执行一次。队列刷新并清空后，这个 job 在下一轮 tick 仍然可以重新加入并执行。

## 2. `queueJob`、flushJobs 和 `nextTick` 分别负责什么？请描述一次 source 修改到 nextTick callback 的执行顺序。

queueJob：将 job 加入去重队列，并安排一次微任务刷新。
flushJobs：执行队列中的所有 job。
nextTick：返回一个 Promise，解决时执行 callback。

> **批改：三个职责基本正确，但漏答了完整执行顺序。** 还需要从 source setter 开始，依次写出 `triggerEffects → scheduler → queueJob → 同步代码结束 → flushJobs → job/runner → currentFlushPromise 完成 → nextTick callback`，并说明同一轮后续的 `queueJob` 只加入 job、不重复安排刷新。请在原答案下面补充这条执行链。

修正：
```
source
-> triggerEffects
-> scheduler
-> queueJob
-> 同步代码结束
-> flushJobs
-> job/runner
-> currentFlushPromise 完成
-> nextTick callback
```

> **复批：执行主链正确，通过。** 同一 tick 内重复触发时还会多次到达 `queueJob`，但 Set 只保留同一个 runner，`isFlushPending` 也会阻止重复创建刷新 Promise；这一点已经在第 1 题中考察，不再要求重复作答。

## 3. 为什么普通 effect 默认同步执行，而需要合并更新的 effect 要通过 scheduler 主动调用 queueJob？

不清楚

> **批改：需要修正。** 普通 effect 默认同步，可以保证修改 source 后立即读取相关结果时已经是最新值，也保持前面章节建立的默认行为。scheduler 是让 effect 的使用者接管“依赖变化后做什么”的策略入口，它本身不等于异步：computed 的 scheduler 可以同步标记 dirty；只有渲染类 effect 的 scheduler 主动调用 `queueJob(runner)` 时，runner 才会延后并去重。请用自己的话重新回答，重点区分“scheduler 回调”和“异步队列”。

修正：普通effect同步执行，可以保证读取结果时是最新值。需要合并更新的effect不需要第一时间获取最新值

> **复批：前半部分正确，但还缺少关键区别。** scheduler 只是接管触发策略，可以同步执行，例如 computed 的 scheduler 同步标记 dirty；只有 scheduler 内部调用 `queueJob(runner)`，runner 才会进入异步队列。请在修正答案后再补充一句，用自己的话说明“有 scheduler 不一定异步”。

cheduler 只是接管 effect 的触发策略，本身不一定异步。
只有 scheduler 调用 queueJob 时，runner 才进入异步队列。

> **最终批改：正确，通过。** 第一行的 `cheduler` 少写了开头字母 `s`，应为 `scheduler`；概念已经区分清楚。scheduler 可以同步执行自己的策略，只有它进一步调用 `queueJob` 时，runner 才进入异步队列。
