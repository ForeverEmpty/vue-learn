# 第六章复习：computed 的缓存与失效

> 批改状态：通过。第 2 题状态需要纠正，第 3、4 题有补充说明。

## 1. 为什么 computed 不能每次读取都直接执行 getter？请说明缓存和惰性分别解决什么问题。

如果getter计算量较大，每次读取都直接执行会浪费资源。
缓存解决了在依赖未变化时，不需要重复计算的问题
惰性解决了在computed未使用时，不需要执行getter的问题

> **批改：正确。** 缓存避免依赖未变化时的重复 getter 调用；惰性保证创建 computed 或缓存失效时都不立即计算，只有实际读取 `.value` 才计算。

## 2. `dirty` 标记在 computed 的生命周期中有哪些状态？依赖变化时为什么先标记失效，而不是立即重新计算？

```text
- 初始状态：true
- 依赖变化时：false
- 依赖未变化时：true
```
按需计算，如果computed未使用，则不需要计算

> **批改：按需计算的原因正确，但 dirty 状态写反了。** 初始为 `true`；成功计算并缓存后变为 `false`；依赖未变化时一直保持 `false`；依赖发生变化时 scheduler 才把它从 `false` 改回 `true`。先标记失效可以保留惰性，如果之后没人读取 computed，就不必执行 getter。


## 3. computed 为什么需要自己的 dep 和内部 ReactiveEffect？请描述源 ref、computed 和外层 effect 之间的通知链路。

自己的dep是为了通知自己的消费者重新执行effect，内部的effect一方面是为了转换dirty的状态和通知外层effect，另一方面是为了执行getter且重新获取依赖
```text
ref变化
-> computed.scheduler()
-> dirty = true
-> triggerEffects(dep)
-> effect.run()
-> computed.value
-> getter()
-> dirty = false
```

> **批改：通知流程基本正确，两个职责需要分清。** 内部 `ReactiveEffect` 执行 getter，并让源 ref 的 dep 收集自己；它的 scheduler 在源依赖变化时标记 dirty，并触发 computed 自己的 dep。完整的两层关系是 `ref.dep → computedEffect` 和 `computed.dep → consumerEffect`。

## 4. scheduler 与直接调用 `effect.run()` 有什么区别？computed 的 scheduler 应该在什么时机触发消费者？

直接调用run会收集一次依赖，而scheduler无需再收集依赖
在dirty由false变为true时，才会触发通知消费者

> **批改：结论正确。** 更精确地说，`run()` 会执行副作用函数，因此函数中的响应式读取会重新收集依赖；scheduler 是替代执行路径，本章的 scheduler 不调用 getter，所以不会发生这次收集。computed 只在 dirty 从 false 变为 true 时触发消费者，避免缓存已经失效时重复通知。
